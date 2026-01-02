const express = require("express");
const router = express.Router();
const memoryController = require("../controllers/memoryController");
const {
  isAuthenticated,
  isCaregiver,
} = require("../middleware/authMiddleware");

// Caregiver view + add
router.get(
  "/caregiver/memory",
  isAuthenticated,
  isCaregiver,
  (req, res) => {
    res.sendFile("memory.html", { root: "views/caregiver" });
  }
);

router.post(
  "/caregiver/memory",
  isAuthenticated,
  isCaregiver,
  memoryController.addMemory
);

// Patient view only
router.get(
  "/patient/memory",
  isAuthenticated,
  (req, res) => {
    res.sendFile("memory.html", { root: "views/patient" });
  }
);

module.exports = router;
