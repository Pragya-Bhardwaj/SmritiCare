const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");
const InviteCode = require("../models/InviteCode");

/* ================= SIGNUP ================= */
exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role
    });

    // PATIENT FLOW
    if (role === "patient") {
      await PatientProfile.create({ userId: user._id });

      const code = "PAT-" + Math.floor(1000 + Math.random() * 9000);
      await InviteCode.create({
        code,
        patientId: user._id
      });

      req.session.user = {
        id: user._id,
        role: "patient",
        inviteCode: code,
        linked: false
      };

      return res.redirect("/patient/welcome");
    }

    // CAREGIVER FLOW
    await CaregiverProfile.create({ userId: user._id });

    req.session.user = {
      id: user._id,
      role: "caregiver",
      linked: false
    };

    res.redirect("/caregiver/link");

  } catch (err) {
    console.error(err);
    res.status(500).send("Signup error");
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("Invalid credentials");

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Invalid credentials");

    req.session.user = {
      id: user._id,
      role: user.role,
      linked: false
    };

    if (user.role === "patient") {
      return res.redirect("/patient/dashboard");
    }

    res.redirect("/caregiver/dashboard");

  } catch (err) {
    console.error(err);
    res.status(500).send("Login error");
  }
};

/* ================= LOGOUT ================= */
exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};

