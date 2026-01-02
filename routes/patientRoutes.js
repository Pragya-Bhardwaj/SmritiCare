const express = require("express");
const router = express.Router();
const patientController = require("../controllers/patientController");
const {
  isAuthenticated,
  isPatient,
} = require("../middleware/authMiddleware");

router.get(
  "/dashboard",
  isAuthenticated,
  isPatient,
  patientController.getDashboard
);

module.exports = router;
