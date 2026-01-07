const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");
const InviteCode = require("../models/InviteCode");
const nodemailer = require("nodemailer");

/* ================= VERIFY OTP ================= */
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
    html: `<h3>Your OTP: <b>${otp}</b></h3>`
  });
}

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
   const user = await User.findOne({ email });
if (!user) return res.send("Invalid credentials");

/* ✅ ADD THIS CHECK HERE */
if (!user.isEmailVerified) {
  return res.send("Please verify your email via OTP first");
}

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

exports.verifyOTP = async (req, res) => {
  const { otp } = req.body;

  const user = await User.findById(req.session.tempUser);
  if (!user) return res.send("Session expired");

  if (
    user.otp.code !== otp ||
    user.otp.expiresAt < Date.now()
  ) {
    return res.send("Invalid or expired OTP");
  }

  user.isEmailVerified = true;
  user.otp = null;
  await user.save();

  req.session.user = {
    id: user._id,
    role: user.role,
    linked: false
  };

  if (user.role === "patient") {
    return res.redirect("/patient/invite");
  }

  res.redirect("/caregiver/link");
};
