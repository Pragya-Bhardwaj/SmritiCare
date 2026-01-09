const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* ================= AUTH MIDDLEWARE ================= */
function requirePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }
  next();
}

/* ================= WELCOME / INVITE PAGE ================= */
router.get("/welcome", requirePatient, async (req, res) => {
  const user = await User.findById(req.session.user.id);

  // 🔒 Block if email not verified
  if (!user || !user.isEmailVerified) {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/welcome.html")
  );
});

/* ================= FETCH INVITE CODE ================= */
router.get("/invite-code", requirePatient, async (req, res) => {
  const invite = await InviteCode.findOne({
    patientId: req.session.user.id
  });

  res.json({ code: invite ? invite.code : null });
});

/* ================= LINK STATUS (POLLING) ================= */
router.get("/link-status", requirePatient, async (req, res) => {
  const user = await User.findById(req.session.user.id);
  if (!user) return res.json({ linked: false });

  // 🔄 Keep session in sync with DB
  req.session.user.linked = user.linked;
  req.session.save(() => {
    res.json({ linked: user.linked });
  });
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", requirePatient, async (req, res) => {
  const user = await User.findById(req.session.user.id);

  if (!user || !user.isEmailVerified) {
    return res.redirect("/auth/login");
  }

  // 🔒 Block dashboard until caregiver links
  if (!user.linked) {
    return res.redirect("/patient/welcome");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

module.exports = router;
