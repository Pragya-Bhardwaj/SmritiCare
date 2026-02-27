const express = require("express");
const router = express.Router();
const selfCareController = require("../controllers/patientSelfCareController");
const {
  requireAuth,
  requireCaregiver
} = require("../middleware/authMiddleware");

// Caregiver-only static self-care tips
router.get(
  "/api/caregiver-tips",
  requireCaregiver,
  selfCareController.getCaregiverTips
);

// Shared patient-tip APIs
router.get("/api/patient-tips", requireAuth, selfCareController.getPatientTips);
router.post(
  "/api/patient-tips",
  requireCaregiver,
  selfCareController.addPatientTip
);
router.put(
  "/api/patient-tips/:id",
  requireCaregiver,
  selfCareController.updatePatientTip
);
router.delete(
  "/api/patient-tips/:id",
  requireCaregiver,
  selfCareController.deletePatientTip
);

module.exports = router;
