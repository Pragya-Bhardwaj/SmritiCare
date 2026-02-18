
// Repeat browser notification every 1 minute for patient
let notificationInterval = null;
function startNotificationRepeater() {
  if (notificationInterval) return;
  notificationInterval = setInterval(() => {
    // You can customize the notification content here
    showInAppNotification('Reminder', 'This is your scheduled notification.');
  }, 60000); // 1 minute
}

document.addEventListener('DOMContentLoaded', startNotificationRepeater);
// Firebase initialization and FCM token management
const firebaseConfig = {
  apiKey: "FIREBASE_API_KEY",
  authDomain: "FIREBASE_AUTH_DOMAIN",
  projectId: "FIREBASE_PROJECT_ID",
  storageBucket: "FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "FIREBASE_MESSAGING_SENDER_ID",
  appId: "FIREBASE_APP_ID"
};
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Check if user has already responded to notification prompt
function shouldShowNotificationPrompt() {
  const dismissed = localStorage.getItem('notificationPromptDismissed');
  return !dismissed;
}

// Show notification permission modal on page load
function initializeNotifications() {
  try {
    // Only show once per user
    if (shouldShowNotificationPrompt()) {
      showNotificationModal();
    } else {
      // If user already responded, just set up the service worker silently
      setupServiceWorker();
    }
  } catch (error) {
    console.error('[FCM] Initialization error:', error);
  }
}

// Show the notification modal
function showNotificationModal() {
  const modal = document.getElementById('notificationModal');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// Close the modal without enabling
function closeNotificationModal() {
  const modal = document.getElementById('notificationModal');
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Decline notifications
function declineNotifications() {
  localStorage.setItem('notificationPromptDismissed', 'true');
  closeNotificationModal();
  console.log('[FCM] Notifications declined by user');
}

// Enable notifications and request permission
async function enableNotifications() {
  try {
    console.log('[FCM] Requesting notification permission...');
    
    // Request notification permission
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('[FCM] Notification permission granted');
      localStorage.setItem('notificationPromptDismissed', 'true');
      closeNotificationModal();
      
      // Set up service worker and get FCM token
      await setupServiceWorker();
      await saveFCMToken();
      
      // Show success message
      showSuccessMessage();
    } else if (permission === 'denied') {
      console.log('[FCM] Notification permission denied');
      localStorage.setItem('notificationPromptDismissed', 'true');
      closeNotificationModal();
      showErrorMessage('Notifications are blocked. Enable them in browser settings to receive updates.');
    } else {
      console.log('[FCM] Notification permission dismissed');
      localStorage.setItem('notificationPromptDismissed', 'true');
      closeNotificationModal();
    }
  } catch (error) {
    console.error('[FCM] Permission error:', error);
    showErrorMessage('Could not enable notifications. Please try again.');
  }
}

// Setup service worker
async function setupServiceWorker() {
  try {
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
      console.log('[FCM] Service Worker registered:', registration);
      return registration;
    }
  } catch (error) {
    console.error('[FCM] Service Worker registration failed:', error);
  }
}

// Get and save FCM token
async function saveFCMToken() {
  try {
    const token = await messaging.getToken({
      vapidKey: FIREBASE_VAPID_PUBLIC_KEY
    });
    
    if (token) {
      console.log('[FCM] Token obtained:', token.substring(0, 20) + '...');
      
      const response = await fetch('/api/notifications/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token })
      });
      
      if (response.ok) {
        console.log('[FCM] Token saved successfully');
      } else {
        console.error('[FCM] Failed to save token');
      }
    }
  } catch (error) {
    console.error('[FCM] Token error:', error);
  }
}

// Handle foreground messages
messaging.onMessage((payload) => {
  console.log('[FCM] Foreground message:', payload);
  const { title, body } = payload.notification;
  showInAppNotification(title, body);
});

// Display in-app notification
function showInAppNotification(title, body) {
  const div = document.createElement('div');
  div.className = 'in-app-notification';
  div.innerHTML = `
    <div class="notification-content">
      <strong>${title}</strong>
      <p>${body}</p>
    </div>
    <button class="notification-close" onclick="this.parentElement.remove()">×</button>
  `;
  document.body.appendChild(div);
  
  // Auto remove after 6 seconds
  setTimeout(() => {
    if (div.parentElement) {
      div.remove();
    }
  }, 6000);
}

// Show success message
function showSuccessMessage() {
  const div = document.createElement('div');
  div.className = 'success-notification';
  div.innerHTML = `
    <div class="success-content">
      <strong>✓ Notifications Enabled!</strong>
      <p>You'll receive helpful reminders every hour.</p>
    </div>
  `;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 4000);
}

// Show error message
function showErrorMessage(message) {
  const div = document.createElement('div');
  div.className = 'error-notification';
  div.innerHTML = `
    <div class="error-content">
      <strong>✕ ${message}</strong>
    </div>
  `;
  document.body.appendChild(div);
  
  setTimeout(() => div.remove(), 5000);
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', initializeNotifications);

// Refresh token periodically (tokens expire)
messaging.onTokenRefresh(async () => {
  console.log('[FCM] Token refreshed');
  await saveFCMToken();
});