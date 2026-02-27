const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

/* AUTH PAGES */

router.get("/login", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      req.session.user.role === "patient"
        ? "/patient/dashboard"
        : "/caregiver/dashboard"
    );
  }
  res.sendFile("login.html", { root: "views/auth" });
});

router.get("/signup", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      req.session.user.role === "patient"
        ? "/patient/dashboard"
        : "/caregiver/dashboard"
    );
  }
  res.sendFile("signup.html", { root: "views/auth" });
});

router.get("/forgot-password", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      req.session.user.role === "patient"
        ? "/patient/dashboard"
        : "/caregiver/dashboard"
    );
  }
  res.sendFile("forgot-password.html", { root: "views/auth" });
});

router.get("/forgot-password/new-password", (req, res) => {
  if (req.session.user) {
    return res.redirect(
      req.session.user.role === "patient"
        ? "/patient/dashboard"
        : "/caregiver/dashboard"
    );
  }

  const resetSession = req.session.passwordReset;
  if (!resetSession || !resetSession.userId || !resetSession.verified) {
    return res.redirect("/auth/forgot-password");
  }

  res.sendFile("reset-password.html", { root: "views/auth" });
});

router.get("/verify-otp", (req, res) => {
  if (!req.session.tempUser) {
    return res.redirect("/auth/signup");
  }
  res.sendFile("otp.html", { root: "views/auth" });
});

/* AUTH ACTIONS */

router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);
router.post("/login", authController.login);
router.post("/forgot-password/request", authController.requestPasswordReset);
router.post("/forgot-password/verify", authController.verifyPasswordResetCode);
router.post("/forgot-password/resend", authController.resendPasswordResetCode);
router.post("/forgot-password/reset", authController.resetPassword);
router.get("/logout", authController.logout);

/* GOOGLE CALENDAR */

router.get("/google/connect",  authController.connectGoogleCalendar);
router.get("/google/callback", authController.googleCalendarCallback);
router.get("/google/status",   authController.googleCalendarStatus);

module.exports = router;