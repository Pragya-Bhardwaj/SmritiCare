const express = require("express");
const router = express.Router();
const path = require("path");
const memoryController = require("../controllers/memoryController");

router.get("/api/memories", memoryController.getMemories);
router.post("/api/memories", memoryController.addMemory);

router.get("/patient/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/patient/memory.html"));
});

router.get("/caregiver/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/caregiver/memory.html"));
});

module.exports = router;
