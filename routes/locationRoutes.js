// routes/locationRoutes.js
const express = require("express");
const router = express.Router();
const locationController = require("../controllers/locationController");

/**
 * AUTHENTICATION MIDDLEWARE
 */

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
      message: "Only patients can perform this action"
    });
  }
  next();
}

function requireCaregiver(req, res, next) {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.status(403).json({
      error: "Forbidden",
      message: "Only caregivers can perform this action"
    });
  }
  next();
}

/**
 * LOCATION ROUTES
 */

/**
 * POST /api/location/update
 * Patient updates their location
 * Automatically checks safe zone and sends alerts
 */
router.post(
  "/api/location/update",
  requireAuth,
  requirePatient,
  locationController.updateLocation
);

/**
 * GET /api/location/patient
 * Caregiver gets linked patient's current location
 * Returns latest location record with patient info and safe zone status
 */
router.get(
  "/api/location/patient",
  requireAuth,
  requireCaregiver,
  locationController.getPatientLocation
);

/**
 * GET /api/location/history
 * Get location history
 */
router.get(
  "/api/location/history",
  requireAuth,
  locationController.getLocationHistory
);

/**
 * GET /api/location/distance
 * Get total distance traveled
 */
router.get(
  "/api/location/distance",
  requireAuth,
  locationController.getDistanceTraveled
);

/**
 * SAFE ZONE ROUTES
 */

/**
 * POST /api/location/safe-zone
 * Create or update safe zone for patient
 * Caregiver only
 */
router.post(
  "/api/location/safe-zone",
  requireAuth,
  requireCaregiver,
  locationController.setSafeZone
);

/**
 * GET /api/location/safe-zone
 * Get safe zone configuration
 * Both caregiver and patient can view
 */
router.get(
  "/api/location/safe-zone",
  requireAuth,
  locationController.getSafeZone
);

/**
 * DELETE /api/location/safe-zone
 * Delete safe zone
 * Caregiver only
 */
router.delete(
  "/api/location/safe-zone",
  requireAuth,
  requireCaregiver,
  locationController.deleteSafeZone
);

module.exports = router;