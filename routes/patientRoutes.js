const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* ================= WELCOME / INVITE PAGE ================= */
router.get("/welcome", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/welcome.html")
  );
});

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

/* ================= LINK STATUS (POLLING) ================= */
router.get("/link-status", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.json({ linked: false });
  }

  const user = await User.findById(req.session.user.id);
  if (!user) return res.json({ linked: false });

  // Keep session in sync
  req.session.user.linked = user.linked;

  res.json({ linked: user.linked });
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  if (!req.session.user.linked) {
    return res.redirect("/patient/welcome");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});


module.exports = router;
