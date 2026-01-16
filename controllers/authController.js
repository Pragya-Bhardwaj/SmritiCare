const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");
const InviteCode = require("../models/InviteCode");
const nodemailer = require("nodemailer");

/* MAIL SETUP */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

async function sendOTP(email, otp) {
  try {
    await transporter.sendMail({
      from: `"SmritiCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SmritiCare - Email Verification",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #667eea;">SmritiCare Email Verification</h2>
          <p>Your OTP code is:</p>
          <h1 style="background: #f0f0f0; padding: 20px; text-align: center; letter-spacing: 5px;">${otp}</h1>
          <p style="color: #666;">This code is valid for 5 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `
    });
    console.log(` OTP sent to ${email}`);
  } catch (err) {
    console.error(" Failed to send OTP email:", err);
    throw new Error("Failed to send verification email");
  }
}

/* INPUT VALIDATION */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  // At least 6 characters, 1 uppercase, 1 number, 1 special char
  if (password.length < 6) return { valid: false, message: "Password must be at least 6 characters" };
  if (!/[A-Z]/.test(password)) return { valid: false, message: "Password must contain an uppercase letter" };
  if (!/[0-9]/.test(password)) return { valid: false, message: "Password must contain a number" };
  if (!/[@$!%*?&#]/.test(password)) return { valid: false, message: "Password must contain a special character (@$!%*?&#)" };
  return { valid: true };
}

/* SIGNUP */
exports.signup = async (req, res) => {
  try {
    let { name, email, password, role } = req.body;

    // Validate inputs
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    name = name.trim();
    email = email.toLowerCase().trim();

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    if (!["patient", "caregiver"].includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Email already registered" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isEmailVerified: false,
      otp: {
        code: otp,
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      }
    });

    console.log(` User created: ${email} (${role})`);

    // Create role-specific profile
    if (role === "patient") {
      await PatientProfile.create({ userId: user._id });

      // Generate unique invite code
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = "PAT-" + Math.floor(1000 + Math.random() * 9000);
        const existing = await InviteCode.findOne({ code });
        if (!existing) isUnique = true;
      }

      await InviteCode.create({
        code,
        patientId: user._id,
        used: false,
        expiresAt: Date.now() +  24 * 60 * 60 * 1000 // 7 days
      });

      console.log(` Patient profile created with invite code: ${code}`);
    } else {
      await CaregiverProfile.create({ userId: user._id });
      console.log(` Caregiver profile created`);
    }

    // Send OTP email
    try {
      await sendOTP(email, otp);
    } catch (emailErr) {
      // Delete user if email fails
      await User.findByIdAndDelete(user._id);
      if (role === "patient") {
        await PatientProfile.deleteOne({ userId: user._id });
        await InviteCode.deleteOne({ patientId: user._id });
      } else {
        await CaregiverProfile.deleteOne({ userId: user._id });
      }
      return res.status(500).json({ error: "Failed to send verification email. Please try again." });
    }

    // Store user ID in temporary session
    req.session.tempUser = user._id.toString();
    await req.session.save();

    return res.json({ 
      success: true,
      message: "OTP sent to your email" 
    });

  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Signup failed. Please try again." });
  }
};

/* VERIFY OTP */
exports.verifyOTP = async (req, res) => {
  try {
    const { otp } = req.body;

    // Validate input
    if (!otp) {
      return res.status(400).json({ error: "OTP is required" });
    }

    // Check temporary session
    if (!req.session.tempUser) {
      return res.status(400).json({ error: "Session expired. Please sign up again." });
    }

    // Find user
    const user = await User.findById(req.session.tempUser);
    if (!user) {
      delete req.session.tempUser;
      return res.status(400).json({ error: "User not found. Please sign up again." });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      delete req.session.tempUser;
      return res.status(400).json({ error: "Email already verified. Please log in." });
    }

    // Validate OTP
    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ error: "No OTP found. Please request a new one." });
    }

    if (user.otp.code !== String(otp).trim()) {
      return res.status(400).json({ error: "Invalid OTP" });
    }

    if (user.otp.expiresAt < Date.now()) {
      return res.status(400).json({ error: "OTP has expired. Please request a new one." });
    }

    // Mark as verified
    user.isEmailVerified = true;
    user.otp = undefined;
    await user.save();

    console.log(` Email verified for ${user.email}`);

    // Create actual session
    req.session.user = {
      id: user._id.toString(),
      role: user.role,
      linked: user.linked || false,
      name: user.name,
      email: user.email
    };

    // Clear temporary session
    delete req.session.tempUser;

    // Save session
    await req.session.save();

    // Determine redirect
    const redirect = user.role === "patient" 
      ? "/patient/welcome" 
      : "/caregiver/link";

    return res.json({
      success: true,
      redirect,
      message: "Email verified successfully"
    });

  } catch (err) {
    console.error("OTP verification error:", err);
    res.status(500).json({ error: "Verification failed. Please try again." });
  }
};

/* LOGIN */
exports.login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    email = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        error: "Please verify your email first",
        needsVerification: true
      });
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid email or password" });
    }

    console.log(` User logged in: ${email}`);

    // Create session with patientId if caregiver is linked
    const sessionData = {
      id: user._id.toString(),
      role: user.role,
      linked: user.linked || false,
      name: user.name,
      email: user.email
    };

    // For caregivers, include patientId if linked
    if (user.role === "caregiver" && user.linkedUser) {
      sessionData.patientId = user.linkedUser.toString();
    }

    req.session.user = sessionData;

    // Save session
    await req.session.save();

    // Determine redirect based on link status
    let redirect;
    if (user.role === "patient") {
      redirect = user.linked ? "/patient/dashboard" : "/patient/welcome";
    } else {
      redirect = user.linked ? "/caregiver/dashboard" : "/caregiver/link";
    }

    return res.json({
      success: true,
      redirect,
      message: "Login successful"
    });

  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Login failed. Please try again." });
  }
};

/* LOGOUT */
exports.logout = (req, res) => {
  const userEmail = req.session.user?.email;

  req.session.destroy((err) => {
    if (err) {
      console.error("Session destroy error:", err);
      return res.status(500).send("Logout failed");
    }

    console.log(` User logged out: ${userEmail || 'unknown'}`);
    res.clearCookie("smriticare.sid");
    res.redirect("/auth/login");
  });
};

/* RESEND OTP */
exports.resendOTP = async (req, res) => {
  try {
    // Check temporary session
    if (!req.session.tempUser) {
      return res.status(400).json({ error: "Session expired. Please sign up again." });
    }

    // Find user
    const user = await User.findById(req.session.tempUser);
    if (!user) {
      delete req.session.tempUser;
      return res.status(400).json({ error: "User not found. Please sign up again." });
    }

    // Check if already verified
    if (user.isEmailVerified) {
      delete req.session.tempUser;
      return res.status(400).json({ error: "Email already verified. Please log in." });
    }

    // Generate new OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));

    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    await user.save();

    // Send OTP
    try {
      await sendOTP(user.email, otp);
      console.log(` OTP resent to ${user.email}`);
    } catch (emailErr) {
      return res.status(500).json({ error: "Failed to send email. Please try again." });
    }

    res.json({ 
      success: true,
      message: "New OTP sent to your email" 
    });

  } catch (err) {
    console.error("Resend OTP error:", err);
    res.status(500).json({ error: "Failed to resend OTP. Please try again." });
  }
};
