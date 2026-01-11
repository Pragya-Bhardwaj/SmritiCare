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

/* ================= CHECK IF LINKED ================= */
async function requireLinked(req, res, next) {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    if (!user.linked) {
      return res.redirect("/patient/welcome");
    }

    next();
  } catch (err) {
    console.error("Link check error:", err);
    res.redirect("/auth/login");
  }
}

/* ================= WELCOME / INVITE PAGE ================= */
router.get("/welcome", requirePatient, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    res.sendFile(
      path.join(__dirname, "../views/patient/welcome.html")
    );
  } catch (err) {
    console.error("Patient welcome error:", err);
    res.redirect("/auth/login");
  }
});

/* ================= FETCH INVITE CODE ================= */
router.get("/invite-code", requirePatient, async (req, res) => {
  try {
    const invite = await InviteCode.findOne({
      patientId: req.session.user.id,
      used: false
    });

    res.json({ code: invite ? invite.code : null });
  } catch (err) {
    console.error("Invite code fetch error:", err);
    res.status(500).json({ code: null });
  }
});

/* ================= LINK STATUS (POLLING) ================= */
router.get("/link-status", requirePatient, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.json({ linked: false });

    // 🔄 Sync session with DB
    req.session.user.linked = user.linked;
    req.session.save(() => {
      res.json({ linked: user.linked });
    });
  } catch (err) {
    console.error("Link status error:", err);
    res.json({ linked: false });
  }
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

/* ================= MEMORY BOARD ================= */
router.get("/memory", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/memory.html")
  );
});

/* ================= REMINDERS ================= */
router.get("/reminders", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/reminders.html")
  );
});

/* ================= MEDICATION ================= */
router.get("/medication", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/medication.html")
  );
});

/* ================= SELF CARE ================= */
router.get("/selfcare", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/selfcare.html")
  );
});

/* ================= PROFILE ================= */
router.get("/profile", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/profile.html")
  );
});

module.exports = router;
