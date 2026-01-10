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

/* ================= PATIENT READY CHECK ================= */
async function ensurePatientReady(req, res, next) {
  const user = await User.findById(req.session.user.id);

  if (!user || !user.isEmailVerified) {
    return res.redirect("/auth/login");
  }

  // Block access until caregiver is linked
  if (!user.linked) {
    return res.redirect("/patient/welcome");
  }

  next();
}

/* ================= WELCOME / INVITE PAGE ================= */
router.get("/welcome", requirePatient, async (req, res) => {
  const user = await User.findById(req.session.user.id);

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

  // Keep session synced with DB
  req.session.user.linked = user.linked;
  req.session.save(() => {
    res.json({ linked: user.linked });
  });
});

/* ================= DASHBOARD ================= */
router.get(
  "/dashboard",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/dashboard.html")
    );
  }
);

/* ================= MEMORY BOARD ================= */
router.get(
  "/memory",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/memory.html")
    );
  }
);

/* ================= REMINDERS ================= */
router.get(
  "/reminders",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/reminders.html")
    );
  }
);

/* ================= MEDICATION ================= */
router.get(
  "/medication",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/medication.html")
    );
  }
);

/* ================= SELF CARE ================= */
router.get(
  "/selfcare",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/selfcare.html")
    );
  }
);

/* ================= PROFILE ================= */
router.get(
  "/profile",
  requirePatient,
  ensurePatientReady,
  (req, res) => {
    res.sendFile(
      path.join(__dirname, "../views/patient/profile.html")
    );
  }
);

module.exports = router;
