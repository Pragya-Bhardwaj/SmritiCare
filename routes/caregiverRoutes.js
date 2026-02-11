const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");
const locationController = require("../controllers/locationController");

/* AUTH MIDDLEWARE */
function requireCaregiver(req, res, next) {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }
  next();
}

/* CHECK IF LINKED */
async function requireLinked(req, res, next) {
  try {
    const user = await User.findById(req.session.user.id);

    if (!user || !user.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    if (!user.linked) {
      return res.redirect("/caregiver/link");
    }

    //  CRITICAL FIX: Ensure patientId is in session
    if (!req.session.user.patientId && user.linkedUser) {
      req.session.user.patientId = user.linkedUser;
      await req.session.save();
    }

    next();
  } catch (err) {
    console.error("Link check error:", err);
    res.redirect("/auth/login");
  }
}

/* LINK PAGE */
router.get("/link", requireCaregiver, async (req, res) => {
  try {
    const caregiver = await User.findById(req.session.user.id);

    if (!caregiver || !caregiver.isEmailVerified) {
      return res.redirect("/auth/login");
    }

    // If already linked, redirect to dashboard
    if (caregiver.linked && caregiver.linkedUser) {
      // Sync session
      req.session.user.linked = true;
      req.session.user.patientId = caregiver.linkedUser;
      await req.session.save();
      return res.redirect("/caregiver/dashboard");
    }

    res.sendFile(
      path.join(__dirname, "../views/caregiver/link.html")
    );
  } catch (err) {
    console.error("Caregiver link page error:", err);
    res.redirect("/auth/login");
  }
});

/* LINK ACTION */
router.post("/link", requireCaregiver, async (req, res) => {
  try {
    const { code } = req.body;

    // Validate input
    if (!code || code.trim() === "") {
      return res.status(400).json({ 
        success: false, 
        error: "Invite code is required" 
      });
    }

    // Find invite code
    const invite = await InviteCode.findOne({ code: code.trim() });

    if (!invite) {
      return res.status(400).json({ 
        success: false, 
        error: "Invalid invite code" 
      });
    }

    // Check if already used
    if (invite.used) {
      return res.status(400).json({ 
        success: false, 
        error: "This invite code has already been used" 
      });
    }

    // Check if expired
    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      return res.status(400).json({ 
        success: false, 
        error: "This invite code has expired" 
      });
    }

    // Get caregiver and patient
    const caregiver = await User.findById(req.session.user.id);
    const patient = await User.findById(invite.patientId);

    // Validate users
    if (!caregiver) {
      return res.status(404).json({ 
        success: false, 
        error: "Caregiver not found" 
      });
    }

    if (!patient || patient.role !== "patient") {
      return res.status(404).json({ 
        success: false, 
        error: "Patient not found" 
      });
    }

    // Check if caregiver is already linked
    if (caregiver.linked && caregiver.linkedUser) {
      return res.status(400).json({ 
        success: false, 
        error: "You are already linked to a patient" 
      });
    }

    // Check if patient is already linked
    if (patient.linked && patient.linkedUser) {
      return res.status(400).json({ 
        success: false, 
        error: "This patient is already linked to another caregiver" 
      });
    }

    //  LINK BOTH SIDES
    invite.used = true;
    invite.usedBy = caregiver._id;

    caregiver.linked = true;
    caregiver.linkedUser = patient._id;

    patient.linked = true;
    patient.linkedUser = caregiver._id;

    // Save all changes
    await Promise.all([
      invite.save(),
      caregiver.save(),
      patient.save()
    ]);

    //  CRITICAL FIX: Store patientId in session
    req.session.user.linked = true;
    req.session.user.patientId = patient._id.toString();

    // Save session and respond
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return res.status(500).json({ 
          success: false, 
          error: "Failed to save session" 
        });
      }

      console.log(" Link successful. Session:", req.session.user);

      res.json({ 
        success: true,
        message: "Successfully linked to patient",
        patientName: patient.name
      });
    });

  } catch (err) {
    console.error("Link error:", err);
    res.status(500).json({ 
      success: false, 
      error: "Linking failed. Please try again." 
    });
  }
});

/* DASHBOARD */
router.get("/dashboard", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
});

/* REMINDERS */
router.get("/reminders", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/reminders.html")
  );
});

/* MEDICATION */
router.get("/medication", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/medication.html")
  );
});

/* MEMORY BOARD */
router.get("/memory", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/memory.html")
  );
});

/* SELF CARE */
router.get("/selfcare", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/selfcare.html")
  );
});

/* LIVE LOCATION */
router.get("/location", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/location.html")
  );
});

/* PROFILE */
router.get("/profile", requireCaregiver, requireLinked, (req, res) => {
  res.sendFile(
    path.join(__dirname, "../views/caregiver/profile.html")
  );
});

// Safe Zone API
router.post("/safezones", requireCaregiver, requireLinked, locationController.setSafeZone);
router.get("/safezones", requireCaregiver, requireLinked, async (req, res) => {
  // Return all safe zones for this caregiver
  const caregiverId = req.session.user.id;
  const zones = await require("../models/SafeZone").find({ caregiverId }).lean();
  res.json(zones.map(z => ({
    _id: z._id,
    name: z.name,
    address: z.address,
    radius: z.radius,
    latitude: z.coordinates.coordinates[1],
    longitude: z.coordinates.coordinates[0]
  })));
});
router.delete("/safezones/:id", requireCaregiver, requireLinked, async (req, res) => {
  const zoneId = req.params.id;
  const caregiverId = req.session.user.id;
  const SafeZone = require("../models/SafeZone");
  const zone = await SafeZone.findOneAndDelete({ _id: zoneId, caregiverId });
  if (zone) {
    res.json({ success: true, message: "Safe zone deleted" });
  } else {
    res.status(404).json({ success: false, message: "Safe zone not found" });
  }
});

module.exports = router;
