// public/js/patientLocationSharing.js

/**
 * Background location sharing for patients
 * Include this script on all patient pages to continuously share location
 */

let locationWatchId = null;
let updateInterval = null;
let lastLocation = null;

// Configuration
const UPDATE_INTERVAL = 60000; // Update every 60 seconds
const MIN_DISTANCE = 50; // Only update if moved 50+ meters

/**
 * Initialize location sharing
 */
function initializeLocationSharing() {
  // Check if geolocation is supported
  if (!navigator.geolocation) {
    console.warn('Geolocation is not supported by this browser');
    return;
  }

  // Request permission and start watching
  requestLocationPermission();
}

/**
 * Request location permission from user
 */
function requestLocationPermission() {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      console.log('✓ Location permission granted');
      startLocationSharing();
    },
    (error) => {
      console.warn('Location permission denied:', error.message);
      // Show user-friendly message
      showLocationPermissionPrompt();
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    }
  );
}

/**
 * Show prompt to enable location
 */
function showLocationPermissionPrompt() {
  // Create a subtle banner at the top
  const banner = document.createElement('div');
  banner.id = 'location-banner';
  banner.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    background: #fef3c7;
    color: #92400e;
    padding: 12px 20px;
    text-align: center;
    font-size: 14px;
    z-index: 9999;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  `;
  banner.innerHTML = `
    📍 Please enable location sharing so your caregiver can assist you if needed.
    <button onclick="requestLocationPermission()" style="
      margin-left: 12px;
      padding: 6px 16px;
      background: #92400e;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    ">Enable Location</button>
  `;
  
  document.body.insertBefore(banner, document.body.firstChild);
}

/**
 * Start continuous location sharing
 */
function startLocationSharing() {
  // Remove permission banner if it exists
  const banner = document.getElementById('location-banner');
  if (banner) banner.remove();

  // Watch position with high accuracy
  locationWatchId = navigator.geolocation.watchPosition(
    handleLocationUpdate,
    handleLocationError,
    {
      enableHighAccuracy: true,
      timeout: 30000,
      maximumAge: 10000
    }
  );

  console.log('✓ Location sharing started');
}

/**
 * Handle location update
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

    if (distance < MIN_DISTANCE) {
      // Location hasn't changed much, skip update
      return;
    }
  }

  // Update location on server
  updateLocationOnServer(latitude, longitude, accuracy);

  // Store for comparison
  lastLocation = { latitude, longitude, accuracy };
}

/**
 * Send location to server
 */
async function updateLocationOnServer(latitude, longitude, accuracy) {
  try {
    const res = await fetch('/api/location/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({ latitude, longitude, accuracy })
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();
    console.log('✓ Location updated:', data);

  } catch (err) {
    console.error('Failed to update location:', err);
  }
}

/**
 * Handle location errors
 */
function handleLocationError(error) {
  console.warn('Location error:', error.message);

  switch(error.code) {
    case error.PERMISSION_DENIED:
      console.log('User denied location permission');
      showLocationPermissionPrompt();
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
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in meters
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
}

/**
 * Stop location sharing (cleanup)
 */
function stopLocationSharing() {
  if (locationWatchId !== null) {
    navigator.geolocation.clearWatch(locationWatchId);
    locationWatchId = null;
    console.log('✓ Location sharing stopped');
  }

  if (updateInterval) {
    clearInterval(updateInterval);
    updateInterval = null;
  }
}

// Start location sharing when page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeLocationSharing);
} else {
  initializeLocationSharing();
}

// Stop location sharing when page unloads
window.addEventListener('beforeunload', stopLocationSharing);

// Expose functions globally for manual control
window.requestLocationPermission = requestLocationPermission;
window.stopLocationSharing = stopLocationSharing;