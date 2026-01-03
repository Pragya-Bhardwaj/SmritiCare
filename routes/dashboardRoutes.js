const express = require("express");
const router = express.Router();
const dashboardController = require("../controllers/dashboardController");

/* PATIENT */
router.get("/dashboard", dashboardController.patientDashboard);
router.get("/welcome", (req, res) => {
  res.sendFile("welcome.html", { root: "views/patient" });
});

/* CAREGIVER */
router.get("/dashboard", dashboardController.caregiverDashboard);
router.get("/link", (req, res) => {
  res.sendFile("link.html", { root: "views/caregiver" });
});

module.exports = router;


