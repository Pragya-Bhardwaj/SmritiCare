// routes/locationRoutes.js
const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

/* MIDDLEWARE */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Please log in"
    });
  }
  next();
}

function requirePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Only patients can update location"
    });
  }
  next();
}

function requireCaregiver(req, res, next) {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Only caregivers can access this"
    });
  }
  next();
}

/* ROUTES */

// Patient updates their location
router.post("/api/location/update", requireAuth, requirePatient, locationController.updateLocation);

// Caregiver gets patient's current location
router.get("/api/location/patient", requireAuth, requireCaregiver, locationController.getPatientLocation);

// Get location history
router.get("/api/location/history", requireAuth, locationController.getLocationHistory);

module.exports = router;