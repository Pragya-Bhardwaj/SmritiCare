const express = require("express");
const router = express.Router();
const path = require("path");
const multer = require("multer");
const cloudinary = require("../config/cloudinary");
const memoryController = require("../controllers/memoryController");

// Use memory storage to get buffer
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    // Accept images
    if (file.fieldname === 'image') {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed for image field'));
      }
    }
    // Accept audio
    else if (file.fieldname === 'audio') {
      if (file.mimetype.startsWith('audio/')) {
        cb(null, true);
      } else {
        cb(new Error('Only audio files are allowed for audio field'));
      }
    } else {
      cb(null, true);
    }
  }
});

// Middleware to handle Cloudinary uploads
const handleCloudinaryUploads = async (req, res, next) => {
  try {
    console.log('📤 Processing Cloudinary uploads...');
    console.log('Files received:', req.files ? Object.keys(req.files) : 'none');

    if (req.files) {
      // Handle image upload
      if (req.files.image && req.files.image[0]) {
        console.log('📷 Uploading image to Cloudinary...');
        const imageFile = req.files.image[0];
        
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'smriticare/memories/images',
              resource_type: 'image',
              transformation: [{ width: 1200, height: 900, crop: 'limit', quality: 'auto' }]
            },
            (error, result) => {
              if (error) {
                console.error('❌ Image upload error:', error);
                reject(error);
              } else {
                console.log('✅ Image uploaded:', result.secure_url);
                resolve(result);
              }
            }
          );
          uploadStream.end(imageFile.buffer);
        });

        req.body.imageUrl = result.secure_url;
        req.body.imagePublicId = result.public_id;
      }

      // Handle audio upload
      if (req.files.audio && req.files.audio[0]) {
        console.log('🎵 Uploading audio to Cloudinary...');
        const audioFile = req.files.audio[0];
        
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'smriticare/memories/audio',
              resource_type: 'video', // Cloudinary uses 'video' for audio
              format: 'mp3'
            },
            (error, result) => {
              if (error) {
                console.error('❌ Audio upload error:', error);
                reject(error);
              } else {
                console.log('✅ Audio uploaded:', result.secure_url);
                resolve(result);
              }
            }
          );
          uploadStream.end(audioFile.buffer);
        });

        req.body.audioUrl = result.secure_url;
        req.body.audioPublicId = result.public_id;
      }
    }

    console.log('✅ Cloudinary uploads complete');
    next();
  } catch (error) {
    console.error('❌ Cloudinary upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload media files',
      details: error.message 
    });
  }
};

// API Routes
router.get("/api/memories", memoryController.getMemories);
router.post("/api/memories", 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), 
  handleCloudinaryUploads, 
  memoryController.addMemory
);
router.put("/api/memories/:id", 
  upload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]), 
  handleCloudinaryUploads, 
  memoryController.updateMemory
);
router.delete("/api/memories/:id", memoryController.deleteMemory);

// Page Routes
router.get("/patient/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/patient/memory.html"));
});

router.get("/caregiver/memory", (req, res) => {
  res.sendFile(path.join(__dirname, "../views/caregiver/memory.html"));
});

module.exports = router;