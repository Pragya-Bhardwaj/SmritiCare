const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

/* ================= AUTH PAGES ================= */

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

router.get("/verify-otp", (req, res) => {
  if (!req.session.tempUser) {
    return res.redirect("/auth/signup");
  }
  res.sendFile("otp.html", { root: "views/auth" });
});

/* ================= AUTH ACTIONS ================= */

router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

module.exports = router;
