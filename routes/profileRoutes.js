const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

/* ================= MIDDLEWARE ================= */
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ================= PROFILE ROUTES ================= */
router.get("/profile", requireAuth, profileController.getProfile);
router.put("/profile", requireAuth, profileController.updateProfile);
router.get("/profile/completion", requireAuth, profileController.checkProfileCompletion);

module.exports = router;