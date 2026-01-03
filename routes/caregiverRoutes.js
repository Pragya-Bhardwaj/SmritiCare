const express = require("express");
const router = express.Router();
const path = require("path");

router.get("/link", (req, res) => {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/link.html")
  );
});

router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
});

module.exports = router;
