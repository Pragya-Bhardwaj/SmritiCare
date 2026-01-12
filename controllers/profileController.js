const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");

/* ================= GET PROFILE ================= */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).select("-password -otp");

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let profile;
    if (user.role === "patient") {
      profile = await PatientProfile.findOne({ userId });
    } else {
      profile = await CaregiverProfile.findOne({ userId });
    }

    // Get linked user details if exists
    let linkedUserData = null;
    if (user.linked && user.linkedUser) {
      const linkedUser = await User.findById(user.linkedUser).select("-password -otp");
      
      if (linkedUser) {
        let linkedProfile;
        if (linkedUser.role === "patient") {
          linkedProfile = await PatientProfile.findOne({ userId: linkedUser._id });
        } else {
          linkedProfile = await CaregiverProfile.findOne({ userId: linkedUser._id });
        }

        linkedUserData = {
          name: linkedUser.name,
          email: linkedUser.email,
          role: linkedUser.role,
          profile: linkedProfile || {}
        };
      }
    }

    res.json({
      user: {
        name: user.name,
        email: user.email,
        role: user.role,
        linked: user.linked
      },
      profile: profile || {},
      linkedUser: linkedUserData
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, phone, gender, age, condition, relation } = req.body;

    // Update user name
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (name && name.trim()) {
      user.name = name.trim();
      await user.save();
    }

    // Update role-specific profile
    let profile;
    if (user.role === "patient") {
      profile = await PatientProfile.findOne({ userId });
      
      if (!profile) {
        profile = await PatientProfile.create({
          userId,
          age: age || null,
          condition: condition || null,
          phone: phone || null,
          gender: gender || null
        });
      } else {
        if (age) profile.age = age;
        if (condition) profile.condition = condition;
        if (phone) profile.phone = phone;
        if (gender) profile.gender = gender;
        await profile.save();
      }
    } else {
      profile = await CaregiverProfile.findOne({ userId });
      
      if (!profile) {
        profile = await CaregiverProfile.create({
          userId,
          relation: relation || null,
          phone: phone || null,
          gender: gender || null
        });
      } else {
        if (relation) profile.relation = relation;
        if (phone) profile.phone = phone;
        if (gender) profile.gender = gender;
        await profile.save();
      }
    }

    res.json({
      success: true,
      message: "Profile updated successfully"
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

/* ================= CHECK PROFILE COMPLETION ================= */
exports.checkProfileCompletion = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    let profile;
    let isComplete = false;

    if (user.role === "patient") {
      profile = await PatientProfile.findOne({ userId });
      
      if (profile) {
        isComplete = !!(
          profile.phone &&
          profile.gender &&
          profile.age &&
          profile.condition
        );
      }
    } else {
      profile = await CaregiverProfile.findOne({ userId });
      
      if (profile) {
        isComplete = !!(
          profile.phone &&
          profile.gender &&
          profile.relation
        );
      }
    }

    res.json({ isComplete });
  } catch (err) {
    console.error("Check profile completion error:", err);
    res.status(500).json({ error: "Failed to check profile status" });
  }
};