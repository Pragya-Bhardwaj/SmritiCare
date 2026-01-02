const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

router.get("/login", (req, res) => {
  res.sendFile("login.html", { root: "views/auth" });
});

router.get("/signup", (req, res) => {
  res.sendFile("signup.html", { root: "views/auth" });
});

router.post("/signup", authController.signup);
router.post("/login", authController.login);
router.get("/logout", authController.logout);

module.exports = router;
