// controllers/profileController.js
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");

/* ================= GET PROFILE DATA ================= */
exports.getProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;

    console.log(`[profileController] getProfile request: userId=${userId}, role=${role}`);

    const user = await User.findById(userId).populate('linkedUser');
    
    if (!user) {
      console.warn(`[profileController] getProfile: user not found: ${userId}`);
      return res.status(404).json({ error: "User not found" });
    }

    let profile, linkedProfile, linkedUser;

    if (role === "patient") {
      profile = await PatientProfile.findOne({ userId });
      
      if (user.linkedUser) {
        linkedUser = await User.findById(user.linkedUser);
        linkedProfile = await CaregiverProfile.findOne({ userId: user.linkedUser });
      }
    } else {
      profile = await CaregiverProfile.findOne({ userId });
      
      if (user.linkedUser) {
        linkedUser = await User.findById(user.linkedUser);
        linkedProfile = await PatientProfile.findOne({ userId: user.linkedUser });
      }
    }

    console.log(`[profileController] returning profile for user ${userId}: profileFound=${!!profile}, linkedUser=${!!linkedUser}`);

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        linked: user.linked
      },
      profile: profile || {},
      linkedUser: linkedUser ? {
        id: linkedUser._id,
        name: linkedUser.name,
        email: linkedUser.email,
        role: linkedUser.role
      } : null,
      linkedProfile: linkedProfile || null
    });

  } catch (err) {
    console.error("Get profile error:", err.stack || err);
    res.status(500).json({ error: "Failed to fetch profile" });
  }
};

/* ================= UPDATE PROFILE ================= */
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;
    const updateData = req.body;

    // Remove sensitive fields
    delete updateData.userId;
    delete updateData._id;
    delete updateData.createdAt;
    delete updateData.updatedAt;

    let profile;

    if (role === "patient") {
      profile = await PatientProfile.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true }
      );
      profile.checkProfileComplete();
      await profile.save();
    } else {
      profile = await CaregiverProfile.findOneAndUpdate(
        { userId },
        { $set: updateData },
        { new: true, upsert: true }
      );
      profile.checkProfileComplete();
      await profile.save();
    }

    res.json({
      success: true,
      profile,
      message: "Profile updated successfully"
    });

  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ error: "Failed to update profile" });
  }
};

/* ================= CHECK PROFILE STATUS ================= */
exports.getProfileStatus = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const role = req.session.user.role;

    let profile;

    if (role === "patient") {
      profile = await PatientProfile.findOne({ userId });
    } else {
      profile = await CaregiverProfile.findOne({ userId });
    }

    const isComplete = profile ? profile.isProfileComplete : false;

    res.json({
      isProfileComplete: isComplete,
      profileExists: !!profile
    });

  } catch (err) {
    console.error("Profile status error:", err);
    res.status(500).json({ 
      isProfileComplete: false,
      profileExists: false 
    });
  }
};