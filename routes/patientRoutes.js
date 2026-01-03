const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/welcome", (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/welcome.html")
  );
});

router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

module.exports = router;
