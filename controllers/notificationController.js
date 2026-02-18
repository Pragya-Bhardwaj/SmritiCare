const admin = require('firebase-admin');
const User = require('../models/User');
const fs = require('fs');

// Initialize Firebase Admin
const serviceAccount = JSON.parse(
  fs.readFileSync(process.env.FIREBASE_ADMIN_SDK_KEY, 'utf8')
);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const notificationMessages = [
  { title: 'Good afternoon!', body: 'Open your page' },
  { title: 'Photo Time', body: 'Tap to see your family photo' },
  { title: 'Memory Moment', body: "Let's see today's memory" },
  { title: 'Smile', body: 'Tap to see something happy' },
  { title: 'Support', body: 'Tap here if you need help' },
  { title: 'Here for You', body: "I'm here for you. Tap anytime" },
  { title: 'Safe Place', body: 'Tap to see your safe place' }
];


/**
 * Save FCM token when user grants notification permission
 */
exports.saveFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ error: 'Token is required' });
    }
    
    if (!req.session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(req.session.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Initialize fcmTokens array if it doesn't exist
    if (!user.fcmTokens) {
      user.fcmTokens = [];
    }

    // Add token if not already present
    if (!user.fcmTokens.includes(token)) {
      user.fcmTokens.push(token);
    }

    await user.save();

    console.log(`[FCM] Token saved for user ${user.email}`);
    res.json({ 
      success: true, 
      message: 'FCM token saved successfully' 
    });
    
  } catch (error) {
    console.error('[FCM] Save token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};

// Send batch notifications
exports.sendBatchNotifications = async (userIds) => {
  const results = await Promise.all(
    userIds.map(id => exports.sendHourlyNotification(id))
  );
  return results;
};


/**
 * Remove FCM token on logout
 */
exports.removeFCMToken = async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token || !req.session.user) {
      return res.status(400).json({ error: 'Invalid request' });
    }

    const user = await User.findById(req.session.user.id);
    if (user && user.fcmTokens) {
      user.fcmTokens = user.fcmTokens.filter(t => t !== token);
      await user.save();
    }

    console.log(`[FCM] Token removed for user ${user?.email}`);
    res.json({ success: true, message: 'Token removed' });
    
  } catch (error) {
    console.error('[FCM] Remove token error:', error);
    res.status(500).json({ error: 'Server error' });
  }
};






