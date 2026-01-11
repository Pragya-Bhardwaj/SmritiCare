const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");
const InviteCode = require("../models/InviteCode");
const nodemailer = require("nodemailer");

/* ================= MAIL SETUP ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTP(email, otp) {
  await transporter.sendMail({
    to: email,
    subject: "SmritiCare OTP Verification",
    html: `<h3>Your OTP: <b>${otp}</b></h3><p>Valid for 5 minutes</p>`
  });
}

/* ================= SIGNUP ================= */
exports.signup = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;
    email = email.toLowerCase().trim();

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isEmailVerified: false,
      otp: {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000
      }
    });

    if (role === "patient") {
      await PatientProfile.create({ userId: user._id });

      const code = "PAT-" + Math.floor(1000 + Math.random() * 9000);
      await InviteCode.create({
        code,
        patientId: user._id,
        linked: false
      });
    } else {
      await CaregiverProfile.create({ userId: user._id });
    }

    await sendOTP(email, otp);

    req.session.tempUser = user._id;

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.session.tempUser);
    if (!user) {
      return res.status(400).json({ error: "Session expired" });
    }

    if (
      !user.otp ||
      user.otp.code !== String(otp) ||
      user.otp.expiresAt < Date.now()
    ) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    user.isEmailVerified = true;
    user.otp = null;
    await user.save();

    req.session.user = {
      id: user._id,
      role: user.role,
      linked: user.linked
    };

    delete req.session.tempUser;

    return res.json({
      redirect:
        user.role === "patient"
          ? "/patient/welcome"
          : "/caregiver/link"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "OTP verification failed" });
  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;
    email = email.toLowerCase().trim();

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Please verify your email via OTP first"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    req.session.user = {
      id: user._id,
      role: user.role,
      linked: user.linked
    };

    return res.json({
      redirect:
        user.role === "patient"
          ? "/patient/dashboard"
          : "/caregiver/dashboard"
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
};

/* ================= LOGOUT ================= */
exports.logout = (req, res) => {
  req.session.regenerate(err => {
    if (err) {
      console.error("Session regenerate error:", err);
    }
    res.redirect("/auth/login");
  });
};

/* ================= RESEND OTP ================= */
exports.resendOTP = async (req, res) => {
  try {
    const user = await User.findById(req.session.tempUser);
    if (!user) {
      return res.status(400).json({ error: "Session expired" });
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    await user.save();

    await sendOTP(user.email, otp);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to resend OTP" });
  }
};