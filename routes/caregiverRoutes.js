const express = require("express");
const router = express.Router();
const caregiverController = require("../controllers/caregiverController");
const {
  isAuthenticated,
  isCaregiver,
} = require("../middleware/authMiddleware");

router.get(
  "/dashboard",
  isAuthenticated,
  isCaregiver,
  caregiverController.getDashboard
);

module.exports = router;
