const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "views/auth" });
});

router.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: "views/auth" });
});

router.get("/verify-otp", (req, res) => {
  res.sendFile("otp.html", { root: "views/auth" });
});

router.post("/verify-otp", authController.verifyOTP);
router.post("/resend-otp", authController.resendOTP);



router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

module.exports = router;
