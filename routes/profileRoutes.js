// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

/* ================= MIDDLEWARE ================= */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
}

/* ================= PROFILE API ROUTES ================= */

// Get current user's profile
router.get("/api/profile", requireAuth, profileController.getProfile);

// Update current user's profile
router.put("/api/profile", requireAuth, profileController.updateProfile);

// Check profile completion status
router.get("/api/profile/status", requireAuth, profileController.getProfileStatus);

module.exports = router;