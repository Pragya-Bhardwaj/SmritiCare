const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* ================= INVITE PAGE ================= */
router.get("/invite", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/invite.html")
  );
});

/* ================= LINK STATUS (POLLING) ================= */
router.get("/link-status", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.json({ linked: false });
  }

  const user = await User.findById(req.session.user.id);
  if (!user) return res.json({ linked: false });

  // Update session
  req.session.user.linked = user.linked;

  res.json({ linked: user.linked });
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  // 🔒 BLOCK DASHBOARD UNTIL LINKED
  if (!req.session.user.linked) {
    return res.redirect("/patient/invite");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

module.exports = router;
