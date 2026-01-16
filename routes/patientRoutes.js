const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* AUTH MIDDLEWARE */
function requirePatient(req, res, next) {
  if (!req.session.user) {
    // If client expects JSON (fetch/XHR), respond with 401; otherwise redirect to login
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.redirect("/auth/login");
  }

  if (req.session.user.role !== "patient") {
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(403).json({ error: "Forbidden" });
    }
    return res.redirect("/auth/login");
  }

  next();
}

/* CHECK IF LINKED */
async function requireLinked(req, res, next) {
  try {
    if (!req.session.user) {
      if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.redirect("/auth/login");
    }

    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      return res.redirect("/auth/login");
    }

    if (!user.linked) {
      // For API calls we return JSON so clients can handle polling, for pages we redirect
      if (req.headers.accept && req.headers.accept.includes("application/json")) {
        return res.status(200).json({ success: true, linked: false });
      }
      return res.redirect("/patient/welcome");
    }

    // Sync session with database
    if (user.linked !== req.session.user.linked) {
      req.session.user.linked = user.linked;
      await req.session.save();
    }

    next();
  } catch (err) {
    console.error("Link check error:", err);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.status(500).json({ error: "Link check failed" });
    }
    res.redirect("/auth/login");
  }
}

/* WELCOME INVITE PAGE */
router.get("/welcome", requirePatient, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    // If already linked, redirect to dashboard
    if (user.linked) {
      req.session.user.linked = true;
      await req.session.save();
      return res.redirect("/patient/dashboard");
    }

    res.sendFile(
      path.join(__dirname, "../views/patient/welcome.html")
    );
  } catch (err) {
    console.error("Patient welcome error:", err);
    res.redirect("/auth/login");
  }
});

/* FETCH INVITE CODE */
router.get("/invite-code", requirePatient, async (req, res) => {
  try {
    let invite = await InviteCode.findOne({
      patientId: req.session.user.id,
      used: false
    }).sort({ createdAt: -1 }); // Get the latest unused code

    // If no invite or expired, generate a new one automatically
    if (!invite || (invite.expiresAt && invite.expiresAt < Date.now())) {
      // Generate unique code
      let code;
      let isUnique = false;
      while (!isUnique) {
        code = "PAT-" + Math.floor(1000 + Math.random() * 9000);
        const existing = await InviteCode.findOne({ code });
        if (!existing) isUnique = true;
      }

      // Create new invite code (7 day expiry)
      invite = await InviteCode.create({
        code,
        patientId: req.session.user.id,
        used: false,
        expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
      });

      console.log(` Generated new invite for patient ${req.session.user.id}: ${code}`);
    }

    res.json({ 
      success: true,
      code: invite.code,
      expiresAt: invite.expiresAt
    });

  } catch (err) {
    console.error("Invite code fetch error:", err);
    res.status(500).json({ 
      error: "Failed to fetch invite code",
      code: null 
    });
  }
});

/* REGENERATE INVITE CODE */
router.post("/invite-code/regenerate", requirePatient, async (req, res) => {
  try {
    // Generate unique code
    let code;
    let isUnique = false;
    while (!isUnique) {
      code = "PAT-" + Math.floor(1000 + Math.random() * 9000);
      const existing = await InviteCode.findOne({ code });
      if (!existing) isUnique = true;
    }

    // Optionally mark previous unused codes as used to avoid confusion
    await InviteCode.updateMany({ patientId: req.session.user.id, used: false }, { $set: { used: true } });

    const invite = await InviteCode.create({
      code,
      patientId: req.session.user.id,
      used: false,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000
    });

    console.log(` Regenerated invite code for patient ${req.session.user.id}: ${code}`);

    res.json({ success: true, code: invite.code, expiresAt: invite.expiresAt });
  } catch (err) {
    console.error("Invite code regenerate error:", err);
    res.status(500).json({ error: "Failed to regenerate invite code" });
  }
});

/* LINK STATUS POLLING */
router.get("/link-status", requirePatient, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    
    if (!user) {
      return res.status(404).json({ 
        error: "User not found",
        linked: false 
      });
    }

    // Update session if status changed
    if (user.linked && !req.session.user.linked) {
      console.log(` Patient ${user.email} is now linked`);
      req.session.user.linked = true;
      
      await req.session.save();
    }

    res.json({ 
      success: true,
      linked: user.linked || false,
      caregiverLinked: user.linkedUser ? true : false
    });

  } catch (err) {
    console.error("Link status error:", err);
    res.status(500).json({ 
      error: "Failed to check link status",
      linked: false 
    });
  }
});

/* DASHBOARD */
router.get("/dashboard", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
});

/* MEMORY BOARD */
router.get("/memory", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/memory.html")
  );
});

/* REMINDERS */
router.get("/reminders", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/reminders.html")
  );
});

/* MEDICATION */
router.get("/medication", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/medication.html")
  );
});

/* SELF CARE */
router.get("/selfcare", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/selfcare.html")
  );
});

/* PROFILE */
router.get("/profile", requirePatient, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/patient/profile.html")
  );
});

module.exports = router;