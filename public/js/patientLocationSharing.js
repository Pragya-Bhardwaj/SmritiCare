/**
 * patientLocationSharing.js - Enhanced Version with Maximum Accuracy
 * Background location tracking with permission-based popup notification
 * Include this script on all patient pages to continuously share location
 */

let locationWatchId = null;
let lastLocation = null;
let isTracking = false;
let popupShown = false; // Track if popup has been shown in current session

// Configuration
const CONFIG = {
  UPDATE_INTERVAL: 15000, // Update every 15 seconds (more frequent)
  MIN_DISTANCE: 5, // Update even for small movements (5 meters instead of 20)
  HIGH_ACCURACY: true, // Maximum GPS accuracy
  TIMEOUT: 60000, // Longer timeout for better accuracy (60 seconds)
  MAX_AGE: 0, // Always get fresh location
  ENABLE_HIGH_ACCURACY: true,
  MAXIMUM_AGE: 0
};

/**
 * Initialize location tracking on page load
 */
async function initializeLocationTracking() {
  if (isTracking) {
    console.log('ℹ️ Location tracking already initialized');
    return;
  }

  if (!navigator.geolocation) {
    console.warn('⚠️ Geolocation is not supported by this browser');
    showLocationNotSupported();
    return;
  }

  // Check actual location permission status
  const permissionStatus = await checkLocationPermission();
  
  if (permissionStatus === 'granted') {
    // Permission already granted - start tracking directly
    console.log('✅ Location permission already granted');
    startLocationTracking();
  } else if (permissionStatus === 'denied') {
    // Permission explicitly denied - show permanent banner
    console.log('❌ Location permission denied');
    showPermanentBanner();
  } else {
    // Permission not yet determined - show popup AND permanent banner
    console.log('❓ Location permission not determined - showing popup');
    showLocationEnablePopup();
    showPermanentBanner();
  }

  console.log('🔐 Location tracking initialization started');
}

/**
 * Check current location permission status
 * Returns: 'granted', 'denied', or 'prompt'
 */
async function checkLocationPermission() {
  if (!navigator.permissions) {
    // Permissions API not available - try direct geolocation check
    return 'prompt';
  }

  try {
    const result = await navigator.permissions.query({ name: 'geolocation' });
    return result.state; // 'granted', 'denied', or 'prompt'
  } catch (error) {
    console.warn('⚠️ Could not check permission status:', error);
    return 'prompt';
  }
}

/**
 * Show popup notification for enabling location sharing
 * Only shown on patient dashboard
 */
function showLocationEnablePopup() {
  // Only show on patient dashboard
  if (!window.location.pathname.includes('/patient/dashboard')) {
    return;
  }

  if (popupShown) return;
  popupShown = true;

  const popup = document.createElement('div');
  popup.id = 'location-enable-popup';
  popup.setAttribute('role', 'dialog');
  popup.setAttribute('aria-modal', 'true');
  popup.setAttribute('aria-labelledby', 'popup-title');
  popup.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease-out;
    backdrop-filter: blur(4px);
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
        box-shadow: 0 25px 70px rgba(0, 0, 0, 0.4);
        animation: slideUp 0.5s ease-out;
        text-align: center;
      }

      .popup-icon {
        font-size: 64px;
        margin-bottom: 16px;
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
        transition: all 0.3s;
        font-family: inherit;
      }

      .btn-enable {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        box-shadow: 0 4px 14px rgba(102, 126, 234, 0.4);
      }

      .btn-enable:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(102, 126, 234, 0.5);
      }

      .btn-not-now {
        background: #f1f5f9;
        color: #64748b;
        border: 2px solid #e2e8f0;
      }

      .btn-not-now:hover {
        background: #e2e8f0;
      }

      @media (max-width: 480px) {
        .popup-content {
          padding: 24px;
        }

        .popup-title {
          font-size: 20px;
        }
      }
    </style>

    <div class="popup-content">
      <span class="popup-icon">📍</span>
      
      <h2 class="popup-title" id="popup-title">Enable Location Sharing</h2>
      
      <p class="popup-subtitle">
        Share your location with your caregiver for safety and quick help in case of emergency.
      </p>

      <div class="popup-actions">
        <button class="popup-btn btn-enable" onclick="enableLocationFromPopup()">
          ✓ Enable Location
        </button>
        <button class="popup-btn btn-not-now" onclick="dismissLocationPopup()">
          Not Now
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(popup);
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
  // Permanent banner stays visible
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
      popupShown = false; // Allow popup to show again next time
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
      removePermanentBanner();
      startLocationTracking();
    },
    (error) => {
      console.warn('⚠️ Location permission denied:', error.message);
      showPermanentBanner();
    },
    {
      enableHighAccuracy: true,
      timeout: CONFIG.TIMEOUT,
      maximumAge: 0
    }
  );
}

/**
 * Start continuous location tracking with high accuracy
 */
function startLocationTracking() {
  if (isTracking) {
    console.log('ℹ️ Already tracking location');
    return;
  }

  isTracking = true;

  // Watch position with MAXIMUM accuracy
  locationWatchId = navigator.geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    {
      enableHighAccuracy: true, // Use GPS
      timeout: CONFIG.TIMEOUT,
      maximumAge: 0 // Always fresh
    }
  );

  console.log('🟢 High-accuracy location tracking started');

  // Send location immediately
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude, accuracy } = position.coords;
      updateLocationOnServer(latitude, longitude, accuracy);
      lastLocation = { latitude, longitude, accuracy };
      console.log(`📍 Initial location: ${latitude.toFixed(7)}, ${longitude.toFixed(7)} (±${Math.round(accuracy)}m)`);
    },
    (error) => console.warn('Failed to get initial location:', error),
    {
      enableHighAccuracy: true,
      timeout: CONFIG.TIMEOUT,
      maximumAge: 0
    }
  );

  // Also update location at regular intervals even if patient doesn't move
  setInterval(() => {
    if (isTracking) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          updateLocationOnServer(latitude, longitude, accuracy);
          lastLocation = { latitude, longitude, accuracy };
        },
        (error) => console.warn('Periodic update failed:', error),
        {
          enableHighAccuracy: true,
          timeout: CONFIG.TIMEOUT,
          maximumAge: 0
        }
      );
    }
  }, CONFIG.UPDATE_INTERVAL);
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

    if (distance < CONFIG.MIN_DISTANCE && accuracy > 20) {
      // Only skip if movement is tiny AND accuracy is poor
      console.log(`↔️ Moved only ${distance.toFixed(1)}m with accuracy ±${Math.round(accuracy)}m, skipping update`);
      return;
    }
  }

  // Update location on server
  updateLocationOnServer(latitude, longitude, accuracy);
  lastLocation = { latitude, longitude, accuracy };

  console.log(
    `📍 Location updated: ${latitude.toFixed(7)}, ${longitude.toFixed(7)} (±${Math.round(accuracy)}m)`
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
      console.error(`⚠️ Location update failed: ${response.status}`);
      return;
    }

    console.log('✅ Location sent to caregiver');
  } catch (error) {
    console.error('⚠️ Network error:', error);
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
      showPermanentBanner();
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
 * Show PERMANENT banner that stays until permission is granted
 * Non-dismissible
 */
function showPermanentBanner() {
  // Check if already exists
  if (document.getElementById('location-permission-banner')) {
    return;
  }

  const banner = document.createElement('div');
  banner.id = 'location-permission-banner';
  banner.setAttribute('role', 'alert');
  banner.setAttribute('aria-live', 'polite');
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
    color: #92400e;
    padding: 16px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 500;
    z-index: 9999;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    animation: slideDown 0.5s ease-out;
    border-bottom: 3px solid #fbbf24;
  `;

  banner.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 16px; max-width: 100%; flex-wrap: wrap;">
      <span style="font-size: 24px;">📍</span>
      <span style="flex: 1; min-width: 280px; font-weight: 600;">
        ⚠️ Location Sharing Required: Your caregiver needs your location to keep you safe. Please enable location sharing.
      </span>
      <button id="enableLocationBtn" style="
        padding: 10px 24px;
        background: #92400e;
        color: white;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 700;
        white-space: nowrap;
        transition: all 0.3s;
        box-shadow: 0 2px 8px rgba(146, 64, 14, 0.3);
      " onmouseover="this.style.background='#7c2d12'; this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 12px rgba(146, 64, 14, 0.4)'" 
         onmouseout="this.style.background='#92400e'; this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 8px rgba(146, 64, 14, 0.3)'">
        🟢 Enable Now
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

  console.log('⚠️ Permanent location banner displayed');
}

/**
 * Remove permanent banner (only when permission is granted)
 */
function removePermanentBanner() {
  const banner = document.getElementById('location-permission-banner');
  if (banner) {
    banner.style.animation = 'slideDown 0.3s ease-out reverse';
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
    }, 300);
    console.log('✅ Permanent banner removed (permission granted)');
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
    padding: 16px 20px;
    text-align: center;
    font-size: 14px;
    font-weight: 600;
    z-index: 9999;
    border-bottom: 3px solid #dc2626;
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
    console.log('📍 Page visible, checking location status...');
    initializeLocationTracking();
  }
});

// Expose functions globally
window.requestLocationPermission = requestLocationPermission;
window.stopLocationTracking = stopLocationTracking;
window.getTrackingStatus = getTrackingStatus;