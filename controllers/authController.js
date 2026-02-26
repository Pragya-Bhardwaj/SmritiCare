const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const CaregiverProfile = require("../models/CaregiverProfile");
const InviteCode = require("../models/InviteCode");
const nodemailer = require("nodemailer");
const { getAuthUrl, exchangeCodeForTokens } = require("../utils/googleCalendar");
const fs = require("fs");
const path = require("path");

/* MAIL SETUP */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const EMAIL_LOGO_CID = "smriticare-logo";

function getEmailLogoAttachment() {
  const imageDir = path.join(__dirname, "../public/images");
  const candidates = [
    "email-logo.png",
    "email-logo.jpg",
    "email-logo.jpeg",
    "email-logo.webp",
    "email-logo.svg",
    "smriticare-logo.png",
    "smriticare-logo.jpg",
    "smriticare-logo.jpeg",
    "smriticare-logo.webp",
    "smriticare-logo.svg"
  ];

  for (const name of candidates) {
    const fullPath = path.join(imageDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        filename: name,
        path: fullPath,
        cid: EMAIL_LOGO_CID
      };
    }
  }

  return null;
}

function buildCodeEmailTemplate({ title, subtitle, code, note, logoSrc }) {
  const brandVisualMarkup = logoSrc
    ? `<div class="brand-mark" style="width: 46px; height: 46px; border-radius: 999px; overflow: hidden; background-color: #ffffff; border: 2px solid rgba(255, 255, 255, 0.34);">
         <img src="${logoSrc}" alt="SmritiCare logo" style="display: block; width: 100%; height: 100%; object-fit: cover;" />
       </div>`
    : `<div class="brand-mark" style="width: 46px; height: 46px; border-radius: 999px; background-color: rgba(255, 255, 255, 0.22); color: #ffffff; font-size: 18px; font-weight: 700; text-align: center; line-height: 46px;">
         SC
       </div>`;

  return `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <title>${title}</title>
        <style>
          @media (prefers-color-scheme: dark) {
            body,
            .bg-main {
              background-color: #0b1220 !important;
            }

            .card {
              background-color: #0f172a !important;
              border-color: #334155 !important;
            }

            .title {
              color: #f8fafc !important;
            }

            .muted {
              color: #cbd5e1 !important;
            }

            .code-box {
              background-color: #111827 !important;
              border-color: #60a5fa !important;
            }

            .code-label {
              color: #bfdbfe !important;
            }

            .code-value {
              color: #f8fafc !important;
            }

            .info-box {
              background-color: #082f49 !important;
              border-left-color: #60a5fa !important;
            }

            .info-text {
              color: #dbeafe !important;
            }

            .footer {
              color: #94a3b8 !important;
            }

            .brand-mark {
              background-color: #1e3a8a !important;
            }

            .brand-sub {
              color: #dbeafe !important;
            }

            .brand-chip {
              background-color: #1e40af !important;
              border-color: #3b82f6 !important;
              color: #dbeafe !important;
            }
          }

          [data-ogsc] .bg-main {
            background-color: #0b1220 !important;
          }

          [data-ogsc] .card {
            background-color: #0f172a !important;
            border-color: #334155 !important;
          }

          [data-ogsc] .title {
            color: #f8fafc !important;
          }

          [data-ogsc] .muted {
            color: #cbd5e1 !important;
          }

          [data-ogsc] .code-box {
            background-color: #111827 !important;
            border-color: #60a5fa !important;
          }

          [data-ogsc] .code-label {
            color: #bfdbfe !important;
          }

          [data-ogsc] .code-value {
            color: #f8fafc !important;
          }

          [data-ogsc] .info-box {
            background-color: #082f49 !important;
            border-left-color: #60a5fa !important;
          }

          [data-ogsc] .info-text {
            color: #dbeafe !important;
          }

          [data-ogsc] .footer {
            color: #94a3b8 !important;
          }

          [data-ogsc] .brand-mark {
            background-color: #1e3a8a !important;
          }

          [data-ogsc] .brand-sub {
            color: #dbeafe !important;
          }

          [data-ogsc] .brand-chip {
            background-color: #1e40af !important;
            border-color: #3b82f6 !important;
            color: #dbeafe !important;
          }
        </style>
      </head>
      <body class="bg-main" style="margin: 0; padding: 0; background-color: #f4f7fb; font-family: Arial, sans-serif;">
        <table role="presentation" class="bg-main" style="width: 100%; border-collapse: collapse; background-color: #f4f7fb; padding: 24px 0;">
          <tr>
            <td align="center">
              <table role="presentation" class="card" style="width: 100%; max-width: 620px; border-collapse: collapse; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 14px; overflow: hidden;">
                <tr>
                  <td style="padding: 18px 24px; background: linear-gradient(135deg, #1e3a8a, #1d4ed8); color: #ffffff;">
                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="width: 54px; vertical-align: middle;">
                          ${brandVisualMarkup}
                        </td>
                        <td style="vertical-align: middle;">
                          <p style="margin: 0; font-size: 19px; font-weight: 700; letter-spacing: 0.2px;">SmritiCare</p>
                          <p class="brand-sub" style="margin: 4px 0 0; font-size: 13px; color: #dbeafe;">Secure account notification</p>
                        </td>
                        <td style="width: 72px; vertical-align: middle;" align="right">
                          <span class="brand-chip" style="display: inline-block; background: rgba(255, 255, 255, 0.18); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.28); border-radius: 999px; padding: 6px 10px; font-size: 11px; font-weight: 700; letter-spacing: 0.8px;">
                            AUTH
                          </span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px 26px 8px;">
                    <h2 class="title" style="margin: 0; color: #0f172a; font-size: 22px;">${title}</h2>
                    <p class="muted" style="margin: 10px 0 0; color: #475569; font-size: 15px; line-height: 1.55;">${subtitle}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 18px 26px 12px;">
                    <div class="code-box" style="background-color: #f8fafc; border: 1px dashed #93c5fd; border-radius: 12px; text-align: center; padding: 18px;">
                      <p class="code-label" style="margin: 0 0 8px; color: #1e3a8a; font-size: 12px; letter-spacing: 0.8px; text-transform: uppercase; font-weight: 700;">Verification code</p>
                      <p class="code-value" style="margin: 0; font-size: 34px; color: #0f172a; letter-spacing: 8px; font-weight: 700;">${code}</p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 26px 24px;">
                    <div class="info-box" style="background-color: #eff6ff; border-left: 4px solid #3b82f6; border-radius: 8px; padding: 12px;">
                      <p class="info-text" style="margin: 0; color: #1e3a8a; font-size: 13px; line-height: 1.5;">
                        This code is valid for <strong>5 minutes</strong>. ${note}
                      </p>
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 26px 22px;">
                    <p class="footer" style="margin: 0; color: #64748b; font-size: 12px; line-height: 1.5;">
                      You received this automated email from SmritiCare. Please do not reply to this message.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

async function sendOTP(email, otp) {
  try {
    const title = "Email Verification";
    const subtitle = "Use the OTP below to verify your SmritiCare account and continue setup.";
    const note = "If you did not request this, please ignore this email.";
    const logoAttachment = getEmailLogoAttachment();
    const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : null;

    await transporter.sendMail({
      from: `"SmritiCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SmritiCare - Email Verification",
      text: `SmritiCare Email Verification\n\nOTP: ${otp}\nThis code is valid for 5 minutes.\nIf you did not request this, please ignore this email.`,
      html: buildCodeEmailTemplate({ title, subtitle, code: otp, note, logoSrc }),
      attachments: logoAttachment ? [logoAttachment] : undefined
    });
    console.log(` OTP sent to ${email}`);
  } catch (err) {
    console.error(" Failed to send OTP email:", err);
    throw new Error("Failed to send verification email");
  }
}

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendPasswordResetCode(email, otp) {
  try {
    const title = "Password Reset Code";
    const subtitle = "Use this OTP to securely reset your SmritiCare password.";
    const note = "If you did not request a password reset, you can ignore this email.";
    const logoAttachment = getEmailLogoAttachment();
    const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : null;

    await transporter.sendMail({
      from: `"SmritiCare" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "SmritiCare - Password Reset Code",
      text: `SmritiCare Password Reset\n\nReset code: ${otp}\nThis code is valid for 5 minutes.\nIf you did not request this, you can ignore this email.`,
      html: buildCodeEmailTemplate({ title, subtitle, code: otp, note, logoSrc }),
      attachments: logoAttachment ? [logoAttachment] : undefined
    });
    console.log(` Password reset code sent to ${email}`);
  } catch (err) {
    console.error(" Failed to send password reset email:", err);
    throw new Error("Failed to send reset code");
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

/* GOOGLE CALENDAR - Redirect to Google consent screen */
exports.connectGoogleCalendar = (req, res) => {
  if (!req.session.user) return res.redirect("/auth/login");
  const url = getAuthUrl(req.session.user.id);
  res.redirect(url);
};

/* GOOGLE CALENDAR - Google redirects back here after user approves */
exports.googleCalendarCallback = async (req, res) => {
  try {
    const { code, state: userId } = req.query;

    if (!code || !userId) {
      return res.redirect("/caregiver/reminders?calendarError=true");
    }

    const tokens = await exchangeCodeForTokens(code);

    await User.findByIdAndUpdate(userId, {
      googleTokens: {
        access_token:  tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date:   tokens.expiry_date
      },
      googleCalendarConnected: true
    });

    // Keep session in sync
    if (req.session.user && req.session.user.id === userId) {
      req.session.user.googleCalendarConnected = true;
      await req.session.save();
    }

    res.redirect("/caregiver/reminders?calendarConnected=true");

  } catch (err) {
    console.error("Google Calendar callback error:", err);
    res.redirect("/caregiver/reminders?calendarError=true");
  }
};

/* GOOGLE CALENDAR - Return connection status for logged-in user */
exports.googleCalendarStatus = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await User.findById(req.session.user.id).select("googleCalendarConnected");
    res.json({ googleCalendarConnected: user?.googleCalendarConnected || false });

  } catch (err) {
    console.error("Google Calendar status error:", err);
    res.status(500).json({ error: "Failed to check status" });
  }
};

/* FORGOT PASSWORD - SEND RESET CODE */
exports.requestPasswordReset = async (req, res) => {
  try {
    let { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    email = email.toLowerCase().trim();

    if (!validateEmail(email)) {
      return res.status(400).json({ error: "Invalid email format" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "No account found with this email" });
    }

    if (!user.isEmailVerified) {
      return res.status(400).json({ error: "Please verify your email first" });
    }

    const otp = generateOTP();
    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    await user.save();

    await sendPasswordResetCode(user.email, otp);

    req.session.passwordReset = {
      userId: user._id.toString(),
      verified: false
    };
    await req.session.save();

    return res.json({
      success: true,
      message: "Reset code sent to your email"
    });
  } catch (err) {
    console.error("Password reset request error:", err);
    return res.status(500).json({ error: "Failed to send reset code. Please try again." });
  }
};

/* FORGOT PASSWORD - VERIFY CODE */
exports.verifyPasswordResetCode = async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({ error: "Reset code is required" });
    }

    const resetSession = req.session.passwordReset;
    if (!resetSession || !resetSession.userId) {
      return res.status(400).json({ error: "Reset session expired. Request a new code." });
    }

    const user = await User.findById(resetSession.userId);
    if (!user) {
      delete req.session.passwordReset;
      await req.session.save();
      return res.status(400).json({ error: "User not found. Request a new code." });
    }

    if (!user.otp || !user.otp.code) {
      return res.status(400).json({ error: "No reset code found. Request a new code." });
    }

    if (user.otp.code !== String(code).trim()) {
      return res.status(400).json({ error: "Invalid reset code" });
    }

    if (user.otp.expiresAt < Date.now()) {
      return res.status(400).json({ error: "Reset code has expired. Request a new code." });
    }

    req.session.passwordReset.verified = true;
    await req.session.save();

    return res.json({
      success: true,
      message: "Code verified. You can now set a new password.",
      redirect: "/auth/forgot-password/new-password"
    });
  } catch (err) {
    console.error("Password reset code verification error:", err);
    return res.status(500).json({ error: "Failed to verify reset code. Please try again." });
  }
};

/* FORGOT PASSWORD - RESEND CODE */
exports.resendPasswordResetCode = async (req, res) => {
  try {
    const resetSession = req.session.passwordReset;
    if (!resetSession || !resetSession.userId) {
      return res.status(400).json({ error: "Reset session expired. Request a new code." });
    }

    const user = await User.findById(resetSession.userId);
    if (!user) {
      delete req.session.passwordReset;
      await req.session.save();
      return res.status(400).json({ error: "User not found. Request a new code." });
    }

    const otp = generateOTP();
    user.otp = {
      code: otp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };
    await user.save();

    await sendPasswordResetCode(user.email, otp);

    req.session.passwordReset.verified = false;
    await req.session.save();

    return res.json({
      success: true,
      message: "New reset code sent to your email"
    });
  } catch (err) {
    console.error("Password reset resend error:", err);
    return res.status(500).json({ error: "Failed to resend reset code. Please try again." });
  }
};

/* FORGOT PASSWORD - SET NEW PASSWORD */
exports.resetPassword = async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: "New password is required" });
    }

    const resetSession = req.session.passwordReset;
    if (!resetSession || !resetSession.userId) {
      return res.status(400).json({ error: "Reset session expired. Request a new code." });
    }

    if (!resetSession.verified) {
      return res.status(400).json({ error: "Please verify the reset code first" });
    }

    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ error: passwordValidation.message });
    }

    const user = await User.findById(resetSession.userId);
    if (!user) {
      delete req.session.passwordReset;
      await req.session.save();
      return res.status(400).json({ error: "User not found. Request a new code." });
    }

    const isSameAsCurrent = await bcrypt.compare(password, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({ error: "New password must be different from the current password" });
    }

    user.password = await bcrypt.hash(password, 12);
    user.otp = undefined;
    await user.save();

    delete req.session.passwordReset;
    await req.session.save();

    return res.json({
      success: true,
      message: "Password reset successful. Please log in."
    });
  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ error: "Failed to reset password. Please try again." });
  }
};
