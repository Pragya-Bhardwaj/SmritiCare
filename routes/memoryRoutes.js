const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const fs = require("fs");
const memoryController = require("../controllers/memoryController");

// Ensure upload directories exist
const imgDir = path.join(__dirname, "../public/uploads/memories/images");
const audioDir = path.join(__dirname, "../public/uploads/memories/audio");
if (!fs.existsSync(imgDir)) fs.mkdirSync(imgDir, { recursive: true });
if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'image') cb(null, imgDir);
    else if (file.fieldname === 'audio') cb(null, audioDir);
    else cb(null, path.join(__dirname, '../public/uploads'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const base = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, base + ext);
  }
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.get("/api/memories", memoryController.getMemories);
router.post("/api/memories", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), memoryController.addMemory);
router.put("/api/memories/:id", upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), memoryController.updateMemory);
router.delete("/api/memories/:id", memoryController.deleteMemory);

router.get("/patient/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/patient/memory.html"));
});

router.get("/caregiver/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/caregiver/memory.html"));
});

module.exports = router;
