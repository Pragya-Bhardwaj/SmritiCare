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
 * Called by patientLocationSharing.js periodically
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
 * Returns latest location record with patient info
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
 * Query parameters:
 *   - hours: Number of hours of history to retrieve (default: 24, max: 72)
 *   - limit: Maximum number of location points (default: 100, max: 500)
 * Accessible to both patients (own) and caregivers (linked patient)
 */
router.get(
  "/api/location/history",
  requireAuth,
  locationController.getLocationHistory
);

/**
 * GET /api/location/distance
 * Get total distance traveled
 * Query parameters:
 *   - hours: Number of hours to calculate distance for (default: 24, max: 72)
 * Accessible to both patients (own) and caregivers (linked patient)
 */
router.get(
  "/api/location/distance",
  requireAuth,
  locationController.getDistanceTraveled
);

/**
 * POST /api/location/cleanup
 * Admin only: Clear old location data
 * Keeps only last 7 days of location history
 */
router.post(
  "/api/location/cleanup",
  requireAuth,
  locationController.cleanupOldLocations
);

module.exports = router;