/**
 * patientLocationSharing.js - Enhanced Version
 * Background location tracking with one-time popup notification
 * Include this script on all patient pages to continuously share location
 */

let locationWatchId = null;
let lastLocation = null;
let isTracking = false;
let popupShown = false; // Track if popup has been shown

// Configuration
const CONFIG = {
  UPDATE_INTERVAL: 30000, // Update every 30 seconds
  MIN_DISTANCE: 20, // Only update if moved 20+ meters
  HIGH_ACCURACY: true,
  TIMEOUT: 30000,
  MAX_AGE: 0,
  BANNER_DURATION: 10000,
  POPUP_STORAGE_KEY: 'smriticare_location_popup_shown' // LocalStorage key
};

/**
 * Initialize location tracking on page load
 */
function initializeLocationTracking() {
  if (isTracking) {
    console.log('ℹ️ Location tracking already initialized');
    return;
  }

  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocation is not supported by this browser');
    showLocationNotSupported();
    return;
  }

  // Check if popup has already been shown in this session/device
  const hasShownPopup = localStorage.getItem(CONFIG.POPUP_STORAGE_KEY);

  if (!hasShownPopup) {
    // First time - show the popup
    showLocationEnablePopup();
  } else {
    // Already shown before - just request permission silently
    requestLocationPermission();
  }

  console.log('🔍 Location tracking initialization started');
}

/**
 * Show one-time popup notification for enabling location sharing
 * This is shown only once per device
 */
function showLocationEnablePopup() {
  if (popupShown) return;
  popupShown = true;

  // Mark popup as shown in localStorage
  localStorage.setItem(CONFIG.POPUP_STORAGE_KEY, 'true');

  const popup = document.createElement('div');
  popup.id = 'location-enable-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-labelledby', 'popup-title');
  popup.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
  `;

  popup.innerHTML = `
    <style>
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      @keyframes slideUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      .popup-content {
        background: white;
        border-radius: 16px;
        padding: 32px;
        max-width: 420px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideUp 0.4s ease-out;
        text-align: center;
      }

      .popup-icon {
        font-size: 64px;
        margin-bottom: 20px;
        display: block;
      }

      .popup-title {
        font-size: 22px;
        font-weight: 700;
        color: #1e293b;
        margin: 0 0 12px 0;
      }

      .popup-subtitle {
        font-size: 14px;
        color: #64748b;
        line-height: 1.6;
        margin: 0 0 24px 0;
      }

      .popup-features {
        background: #f0f9ff;
        border-left: 4px solid #667eea;
        padding: 16px;
        border-radius: 8px;
        margin-bottom: 24px;
        text-align: left;
      }

      .feature-item {
        font-size: 13px;
        color: #334155;
        margin: 8px 0;
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .feature-item::before {
        content: "✓";
        color: #10b981;
        font-weight: bold;
        flex-shrink: 0;
      }

      .popup-actions {
        display: flex;
        gap: 12px;
        flex-direction: column;
      }

      .popup-btn {
        padding: 14px 24px;
        border: none;
        border-radius: 10px;
        font-weight: 600;
        cursor: pointer;
        font-size: 15px;
        transition: all 0.2s;
      }

      .btn-enable {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-enable:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(102, 126, 234, 0.3);
      }

      .btn-enable:active {
        transform: translateY(0);
      }

      .btn-not-now {
        background: #f1f5f9;
        color: #64748b;
      }

      .btn-not-now:hover {
        background: #e2e8f0;
      }

      .popup-footer {
        font-size: 12px;
        color: #94a3b8;
        margin-top: 16px;
        line-height: 1.5;
      }

      @media (max-width: 480px) {
        .popup-content {
          padding: 24px;
        }

        .popup-title {
          font-size: 18px;
        }

        .popup-btn {
          padding: 12px 20px;
          font-size: 14px;
        }
      }
    </style>

    <div class="popup-content">
      <span class="popup-icon">📍</span>
      
      <h2 class="popup-title" id="popup-title">Enable Location Sharing?</h2>
      
      <p class="popup-subtitle">
        Share your location with your caregiver for added safety and peace of mind
      </p>

      <div class="popup-features">
        <div class="feature-item">Real-time location updates</div>
        <div class="feature-item">24-hour location history</div>
        <div class="feature-item">Only visible to your caregiver</div>
        <div class="feature-item">You can pause anytime</div>
      </div>

      <div class="popup-actions">
        <button class="popup-btn btn-enable" onclick="enableLocationFromPopup()">
          🟢 Enable Location
        </button>
        <button class="popup-btn btn-not-now" onclick="dismissLocationPopup()">
          Not Now
        </button>
      </div>

      <div class="popup-footer">
        <p style="margin: 0;">
          Your location is encrypted and secure.<br>
          This request appears once per device.
        </p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Close on Escape key
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      dismissLocationPopup();
    }
  };
  document.addEventListener('keydown', handleEscape, { once: true });
}

/**
 * Enable location from popup button click
 */
function enableLocationFromPopup() {
  console.log('✅ User enabled location from popup');
  removePopup();
  requestLocationPermission();
}

/**
 * Dismiss popup without enabling
 */
function dismissLocationPopup() {
  console.log('⏭️ User dismissed location popup');
  removePopup();
  // Show banner instead, asking again later
  setTimeout(() => {
    showLocationPermissionBanner();
  }, 1000);
}

/**
 * Remove popup from DOM
 */
function removePopup() {
  const popup = document.getElementById('location-enable-popup');
  if (popup) {
    popup.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => {
      if (popup.parentNode) {
        popup.parentNode.removeChild(popup);
      }
    }, 300);
  }
}

/**
 * Request location permission from user
 */
function requestLocationPermission() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✅ Location permission granted');
      removeBanner();
      startLocationTracking();
    },
    (error) => {
      console.warn('❌ Location permission denied:', error.message);
      showLocationPermissionBanner();
    },
    {
      enableHighAccuracy: CONFIG.HIGH_ACCURACY,
      timeout: CONFIG.TIMEOUT,
      maximumAge: CONFIG.MAX_AGE
    }
  );
}

/**
 * Start continuous location tracking
 */
function startLocationTracking() {
  if (isTracking) {
    console.log('ℹ️ Already tracking location');
    return;
  }

  isTracking = true;

  // Watch position with high accuracy
  locationWatchId = navigator.geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    {
      enableHighAccuracy: CONFIG.HIGH_ACCURACY,
      timeout: CONFIG.TIMEOUT,
      maximumAge: CONFIG.MAX_AGE
    }
  );

  console.log('🟢 Live location tracking started');

  // Send location immediately
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateLocationOnServer(latitude, longitude, accuracy);
      lastLocation = { latitude, longitude, accuracy };
    },
    (error) => console.warn('Failed to get initial location:', error)
  );
}

/**
 * Handle location update from watchPosition
 */
function handleLocationUpdate(position) {
  const { latitude, longitude, accuracy } = position.coords;

  // Check if location changed significantly
  if (lastLocation) {
    const distance = calculateDistance(
      lastLocation.latitude,
      lastLocation.longitude,
      latitude,
      longitude
    );

    if (distance < CONFIG.MIN_DISTANCE) {
      console.log(`↔️ Moved only ${distance.toFixed(1)}m, skipping update`);
      return;
    }
  }

  // Update location on server
  updateLocationOnServer(latitude, longitude, accuracy);
  lastLocation = { latitude, longitude, accuracy };

  console.log(
    `📍 Location updated: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
  );
}

/**
 * Send location to server
 */
async function updateLocationOnServer(latitude, longitude, accuracy) {
  try {
    const response = await fetch('/api/location/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        latitude,
        longitude,
        accuracy: accuracy ? Math.round(accuracy) : null
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`❌ Location update failed: ${response.status}`);
      return;
    }

    console.log('✅ Location sent to caregiver');
  } catch (error) {
    console.error('❌ Network error:', error);
  }
}

/**
 * Handle location errors
 */
function handleLocationError(error) {
  console.warn('⚠️ Location error:', error.message);

  switch (error.code) {
    case error.PERMISSION_DENIED:
      console.log('User denied location permission');
      showLocationPermissionBanner();
      break;
    case error.POSITION_UNAVAILABLE:
      console.log('Location information unavailable');
      break;
    case error.TIMEOUT:
      console.log('Location request timed out');
      break;
  }
}

/**
 * Calculate distance using Haversine formula
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Show permission request banner
 */
function showLocationPermissionBanner() {
  removeBanner();

  const banner = document.createElement('div');
  banner.id = 'location-permission-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #fef3c7, #fcd34d);
    color: #92400e;
    padding: 14px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideDown 0.3s ease-out;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 12px; max-width: 100%;">
      <span>📍</span>
      <span style="flex: 1;">Please enable location sharing so your caregiver can help you if needed.</span>
      <button id="enableLocationBtn" style="
        margin-left: 12px;
        padding: 8px 20px;
        background: #92400e;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
        transition: background 0.2s;
      " onmouseover="this.style.background='#7a3408'" onmouseout="this.style.background='#92400e'">
        Enable Location
      </button>
    </div>
    <style>
      @keyframes slideDown {
        from {
          transform: translateY(-100%);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
    </style>
  `;

  document.body.insertBefore(banner, document.body.firstChild);

  // Add click handler
  document.getElementById('enableLocationBtn').addEventListener('click', () => {
    requestLocationPermission();
  });

  // Auto-hide after duration
  setTimeout(() => {
    if (document.getElementById('location-permission-banner')) {
      removeBanner();
    }
  }, CONFIG.BANNER_DURATION);
}

/**
 * Remove permission banner
 */
function removeBanner() {
  const banner = document.getElementById('location-permission-banner');
  if (banner) {
    banner.style.animation = 'slideUp 0.3s ease-out forwards';
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
  }
}

/**
 * Show browser doesn't support geolocation
 */
function showLocationNotSupported() {
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #fee2e2;
    color: #b91c1c;
    padding: 14px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
  `;
  message.textContent =
    '⚠️ Location sharing is not supported by your browser. Please update your browser.';
  document.body.insertBefore(message, document.body.firstChild);
}

/**
 * Stop location tracking
 */
function stopLocationTracking() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
    isTracking = false;
    console.log('⛔ Location tracking stopped');
  }
}

/**
 * Get tracking status
 */
function getTrackingStatus() {
  return {
    isTracking,
    lastLocation,
    watchId: locationWatchId,
    popupShown
  };
}

/**
 * Reset popup (for testing - shows popup again)
 */
function resetLocationPopup() {
  localStorage.removeItem(CONFIG.POPUP_STORAGE_KEY);
  popupShown = false;
  console.log('🔄 Location popup reset - will show again on next page load');
}

// ============================================
// AUTO-INITIALIZATION
// ============================================

// Start tracking when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLocationTracking);
} else {
  initializeLocationTracking();
}

// Stop tracking when page unloads
window.addEventListener('beforeunload', stopLocationTracking);

// Restart tracking if page becomes visible
document.addEventListener('visibilitychange', () => {
  if (!document.hidden && !isTracking) {
    console.log('📍 Page visible, resuming location tracking...');
    requestLocationPermission();
  }
});

// Expose functions globally
window.requestLocationPermission = requestLocationPermission;
window.stopLocationTracking = stopLocationTracking;
window.getTrackingStatus = getTrackingStatus;
window.resetLocationPopup = resetLocationPopup;