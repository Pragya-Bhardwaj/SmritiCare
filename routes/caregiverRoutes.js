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

  // 🔒 Block if email not verified
  if (!caregiver || !caregiver.isEmailVerified) {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/link.html")
  );
});

/* ================= LINK ACTION ================= */
router.post("/link", requireCaregiver, async (req, res) => {
  try {
    const caregiver = await User.findById(req.session.user.id);
    if (!caregiver || !caregiver.isEmailVerified) {
      return res.json({ success: false, error: "Unauthorized" });
    }

    const { code } = req.body;
    if (!code) {
      return res.json({ success: false, error: "Invite code required" });
    }

    const invite = await InviteCode.findOne({ code });
    if (!invite || invite.linked) {
      return res.json({ success: false, error: "Invalid invite code" });
    }

    const patient = await User.findById(invite.patientId);
    if (!patient || patient.role !== "patient") {
      return res.json({ success: false, error: "Patient not found" });
    }

    // 🔗 LINK BOTH SIDES (ATOMIC STYLE)
    invite.linked = true;
    patient.linked = true;
    patient.linkedUser = caregiver._id;
    caregiver.linked = true;
    caregiver.linkedUser = patient._id;

    await Promise.all([
      invite.save(),
      patient.save(),
      caregiver.save()
    ]);

    // 🔄 Sync session
    req.session.user.linked = true;
    req.session.save(() => {
      res.json({ success: true });
    });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Linking failed" });
  }
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", requireCaregiver, async (req, res) => {
  const caregiver = await User.findById(req.session.user.id);

  if (!caregiver || !caregiver.isEmailVerified) {
    return res.redirect("/auth/login");
  }

  if (!caregiver.linked) {
    return res.redirect("/caregiver/link");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
});

module.exports = router;
