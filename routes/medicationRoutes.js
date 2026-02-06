// routes/medicationRoutes.js
const express = require("express");
const router = express.Router();
const medicationController = require("../controllers/medicationController");

/**
 * MEDICATION API ROUTES
 * Accessible to both caregivers and patients (read)
 */

// Get medications
router.get("/api/medications", medicationController.getMedications);

// Add medication (caregiver only)
router.post("/api/medications", medicationController.addMedication);

// Update medication (caregiver only)
router.put("/api/medications/:id", medicationController.updateMedication);

// Delete medication (caregiver only)
router.delete("/api/medications/:id", medicationController.deleteMedication);

module.exports = router;
