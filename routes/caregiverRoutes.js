const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* ================= AUTH MIDDLEWARE ================= */
function requireCaregiver(req, res, next) {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }
  next();
}

/* ================= LINK PAGE ================= */
router.get("/link", requireCaregiver, async (req, res) => {
  const caregiver = await User.findById(req.session.user.id);
  if (!caregiver || !caregiver.isEmailVerified) {
    return res.redirect("/auth/login");
  }
  res.sendFile(path.join(__dirname, "../views/caregiver/link.html"));
});

/* ================= LINK ACTION ================= */
router.post("/link", requireCaregiver, async (req, res) => {
  try {
    const caregiver = await User.findById(req.session.user.id);
    if (!caregiver || !caregiver.isEmailVerified) {
      return res.json({ success: false, error: "Unauthorized" });
    }

    const invite = await InviteCode.findOne({ code: req.body.code });
    if (!invite || invite.linked) {
      return res.json({ success: false, error: "Invalid invite code" });
    }

    const patient = await User.findById(invite.patientId);

    invite.linked = true;
    caregiver.linked = true;
    caregiver.linkedUser = patient._id;
    patient.linked = true;
    patient.linkedUser = caregiver._id;

    await Promise.all([invite.save(), caregiver.save(), patient.save()]);

    req.session.user.linked = true;
    req.session.save(() => res.json({ success: true }));
  } catch {
    res.json({ success: false });
  }
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", requireCaregiver, async (req, res) => {
  const caregiver = await User.findById(req.session.user.id);
  if (!caregiver || !caregiver.linked) {
    return res.redirect("/caregiver/link");
  }
  res.sendFile(path.join(__dirname, "../views/caregiver/dashboard.html"));
});

module.exports = router;
