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
    const { name, email, password, role } = req.body;

    const existing = await User.findOne({ email });
    if (existing) return res.send("User already exists");

    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔐 Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

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

    // Role-based setup
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

    // 📩 Send OTP
    await sendOTP(email, otp);

    // Temporary session for OTP verification
    req.session.tempUser = user._id;

    return res.redirect("/auth/verify-otp");

  } catch (err) {
    console.error(err);
    res.status(500).send("Signup error");
  }
};

/* ================= VERIFY OTP ================= */
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    const user = await User.findById(req.session.tempUser);
    if (!user) return res.send("Session expired. Please signup again.");

    if (
      !user.otp ||
      user.otp.code !== otp ||
      user.otp.expiresAt < Date.now()
    ) {
      return res.send("Invalid");
    }

    user.isEmailVerified = true;
    user.otp = null;
    await user.save();

    req.session.user = {
      id: user._id,
      role: user.role,
      linked: false
    };

    delete req.session.tempUser;

    if (user.role === "patient") {
      return res.redirect("/patient/welcome");
    }

    res.redirect("/caregiver/link");

  } catch (err) {
    console.error(err);
    res.status(500).send("OTP verification failed");
    

  }
};

/* ================= LOGIN ================= */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.send("Invalid credentials");

    // 🔒 BLOCK LOGIN UNTIL EMAIL VERIFIED
    if (!user.isEmailVerified) {
      return res.send("Please verify your email via OTP first");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.send("Invalid credentials");

    req.session.user = {
      id: user._id,
      role: user.role,
      linked: user.linked
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
/* ================= RESEND OTP ================= */
exports.resendOTP = async (req, res) => {
  try {
    const user = await User.findById(req.session.tempUser);
    if (!user) return res.json({ success: false });

    const otp = Math.floor(100000 + Math.random() * 900000);

    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    await user.save();

    await sendOTP(user.email, otp);

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
};
