const express = require("express");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const os = require("os");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const memoryController = require("../controllers/memoryController");

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.fieldname === "image") {
      return file.mimetype.startsWith("image/")
        ? cb(null, true)
        : cb(new Error("Only image files are allowed for image field"));
    }

    if (file.fieldname === "audio") {
      return file.mimetype.startsWith("audio/")
        ? cb(null, true)
        : cb(new Error("Only audio files are allowed for audio field"));
    }

    if (file.fieldname === "video") {
      return file.mimetype.startsWith("video/")
        ? cb(null, true)
        : cb(new Error("Only video files are allowed for video field"));
    }

    cb(null, true);
  }
});

async function uploadToCloudinary(file, options) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(options, (error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve(result);
      }
    });

    uploadStream.end(file.buffer);
  });
}

async function uploadVideoToCloudinary(file) {
  const ext = path.extname(file.originalname || "") || ".mp4";
  const safeBase = path
    .basename(file.originalname || "memory-video", ext)
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .slice(0, 60) || "memory-video";
  const tempPath = path.join(os.tmpdir(), `${Date.now()}-${safeBase}${ext}`);

  await fs.promises.writeFile(tempPath, file.buffer);

  try {
    return await cloudinary.uploader.upload(tempPath, {
      folder: "smriticare/memories/video",
      resource_type: "video"
    });
  } finally {
    await fs.promises.unlink(tempPath).catch(() => {});
  }
}

const handleCloudinaryUploads = async (req, res, next) => {
  try {
    req.uploadWarnings = [];

    if (req.files?.image?.[0]) {
      try {
        const result = await uploadToCloudinary(req.files.image[0], {
          folder: "smriticare/memories/images",
          resource_type: "image",
          transformation: [{ width: 1200, height: 900, crop: "limit", quality: "auto" }]
        });

        req.body.imageUrl = result.secure_url;
        req.body.imagePublicId = result.public_id;
      } catch (error) {
        console.error("Image upload error:", error.message);
        req.uploadWarnings.push("Image upload failed, but the memory was still saved.");
      }
    }

    if (req.files?.audio?.[0]) {
      try {
        const result = await uploadToCloudinary(req.files.audio[0], {
          folder: "smriticare/memories/audio",
          resource_type: "video",
          format: "mp3"
        });

        req.body.audioUrl = result.secure_url;
        req.body.audioPublicId = result.public_id;
      } catch (error) {
        console.error("Audio upload error:", error.message);
        req.uploadWarnings.push("Audio upload failed, but the memory was still saved.");
      }
    }

    if (req.files?.video?.[0]) {
      try {
        const result = await uploadVideoToCloudinary(req.files.video[0]);

        req.body.videoUrl = result.secure_url;
        req.body.videoPublicId = result.public_id;
      } catch (error) {
        console.error("Video upload error:", error.message);
        return res.status(400).json({
          error: "Video upload failed",
          message: error.message || "Cloudinary could not upload the selected video."
        });
      }
    }

    next();
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    res.status(500).json({
      error: "Failed to upload media files",
      message: error.message
    });
  }
};

router.get("/api/memories", memoryController.getMemories);
router.post(
  "/api/memories",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  handleCloudinaryUploads,
  memoryController.addMemory
);
router.put(
  "/api/memories/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "audio", maxCount: 1 },
    { name: "video", maxCount: 1 }
  ]),
  handleCloudinaryUploads,
  memoryController.updateMemory
);
router.delete("/api/memories/:id", memoryController.deleteMemory);

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        error: "Upload too large",
        message: "Each memory file must be 100MB or smaller."
      });
    }

    return res.status(400).json({
      error: "Upload error",
      message: err.message
    });
  }

  if (err) {
    return res.status(400).json({
      error: "Upload error",
      message: err.message || "Failed to process uploaded file."
    });
  }

  next();
});

router.get("/patient/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/patient/memory.html"));
});

router.get("/caregiver/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/caregiver/memory.html"));
});

module.exports = router;
