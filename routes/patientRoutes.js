const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

<<<<<<< HEAD
/* ================= WELCOME / INVITE PAGE ================= */
router.get("/welcome", async (req, res) => {
=======
/* ================= INVITE PAGE ================= */
router.get("/invite", async (req, res) => {
>>>>>>> 5cd634d807f5528edb618601de0ae1886f0e72ee
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/invite.html")
  );
});

<<<<<<< HEAD
/* ================= FETCH INVITE CODE ================= */
router.get("/invite-code", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.json({ code: null });
  }

  const invite = await InviteCode.findOne({
    patientId: req.session.user.id
  });

  res.json({ code: invite?.code || null });
});

=======
>>>>>>> 5cd634d807f5528edb618601de0ae1886f0e72ee
/* ================= LINK STATUS (POLLING) ================= */
router.get("/link-status", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.json({ linked: false });
  }

  const user = await User.findById(req.session.user.id);
  if (!user) return res.json({ linked: false });

<<<<<<< HEAD
  // Keep session in sync
=======
  // Update session
>>>>>>> 5cd634d807f5528edb618601de0ae1886f0e72ee
  req.session.user.linked = user.linked;

  res.json({ linked: user.linked });
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

<<<<<<< HEAD
  // 🔒 BLOCK DASHBOARD UNTIL CAREGIVER LINKS
  if (!req.session.user.linked) {
    return res.redirect("/patient/welcome");
=======
  // 🔒 BLOCK DASHBOARD UNTIL LINKED
  if (!req.session.user.linked) {
    return res.redirect("/patient/invite");
>>>>>>> 5cd634d807f5528edb618601de0ae1886f0e72ee
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

module.exports = router;
