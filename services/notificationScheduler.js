const cron = require('node-cron');
const notificationController = require('../controllers/notificationController');
const User = require('../models/User');

function initializeNotificationScheduler() {
  // Run every hour at minute 0
  cron.schedule('0 * * * *', async () => {
    console.log('[Scheduler] Hourly notification job started');
    try {
      const users = await User.find({
        fcmTokens: { $exists: true, $ne: [] },
        notificationsEnabled: { $ne: false }
      }).select('_id');

      console.log(`[Scheduler] Notifying ${users.length} users`);
      await notificationController.sendBatchNotifications(
        users.map(u => u._id)
      );
    } catch (error) {
      console.error('[Scheduler] Error:', error);
    }
  });

  console.log('[Scheduler] Notification scheduler initialized');
}

module.exports = { initializeNotificationScheduler };