const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Save FCM token when user grants notification permission
router.post('/save-token', requireAuth, notificationController.saveFCMToken);

// Remove FCM token on logout
router.post('/remove-token', requireAuth, notificationController.removeFCMToken);

module.exports = router;