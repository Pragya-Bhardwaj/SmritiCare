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

/* ================= CHECK IF LINKED ================= */
async function requireLinked(req, res, next) {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    if (!user.linked) {
      return res.redirect("/caregiver/link");
    }

    next();
  } catch (err) {
    console.error("Link check error:", err);
    res.redirect("/auth/login");
  }
}

/* ================= LINK PAGE ================= */
router.get("/link", requireCaregiver, async (req, res) => {
  try {
    const caregiver = await User.findById(req.session.user.id);

    if (!caregiver || !caregiver.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    res.sendFile(
      path.join(__dirname, "../views/caregiver/link.html")
    );
  } catch (err) {
    console.error("Caregiver link page error:", err);
    res.redirect("/auth/login");
  }
});

/* ================= LINK ACTION ================= */
router.post("/link", requireCaregiver, async (req, res) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.json({ success: false, error: "Invite code required" });
    }

    const invite = await InviteCode.findOne({ code });

    if (!invite || invite.linked) {
      return res.json({ success: false, error: "Invalid invite code" });
    }

    const caregiver = await User.findById(req.session.user.id);
    const patient = await User.findById(invite.patientId);

    if (!caregiver || !patient || patient.role !== "patient") {
      return res.json({ success: false, error: "User not found" });
    }

    // 🔗 LINK BOTH SIDES
    invite.linked = true;

    caregiver.linked = true;
    caregiver.linkedUser = patient._id;

    patient.linked = true;
    patient.linkedUser = caregiver._id;

    await Promise.all([
      invite.save(),
      caregiver.save(),
      patient.save()
    ]);

    // 🔄 Sync session
    req.session.user.linked = true;
    req.session.save(() => {
      res.json({ success: true });
    });

  } catch (err) {
    console.error("Link error:", err);
    res.json({ success: false, error: "Linking failed" });
  }
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
});

/* ================= REMINDERS ================= */
router.get("/reminders", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/reminders.html")
  );
});

/* ================= MEDICATION ================= */
router.get("/medication", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/medication.html")
  );
});

/* ================= MEMORY BOARD ================= */
router.get("/memory", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/memory.html")
  );
});

/* ================= SELF CARE ================= */
router.get("/selfcare", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/selfcare.html")
  );
});

/* ================= LIVE LOCATION ================= */
router.get("/location", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/location.html")
  );
});

/* ================= PROFILE ================= */
router.get("/profile", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/profile.html")
  );
});

module.exports = router;

