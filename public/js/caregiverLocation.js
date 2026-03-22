/**
 * caregiverLocation.js
 * Real-time location display for caregivers using Mapbox GL JS
 * Shows patient's live location with accuracy circle and location history
 */

let map;
let marker;
let accuracyCircle;
let routeSource;
let refreshInterval;
let MAPBOX_TOKEN = '';
let patientData = null;

// Configuration
const CONFIG = {
  DEFAULT_LAT: 28.7041, // New Delhi
  DEFAULT_LNG: 77.1025,
  DEFAULT_ZOOM: 12,
  LOCATION_REFRESH_INTERVAL: 30000, // 30 seconds
  MAP_STYLE: 'mapbox://styles/mapbox/streets-v12',
  MARKER_SIZE: 32,
  CIRCLE_COLOR: '#667eea',
  CIRCLE_OPACITY: 0.3,
  CIRCLE_STROKE_COLOR: '#667eea',
  CIRCLE_STROKE_OPACITY: 0.6
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely add a layer to the map, optionally before settlement-label
 * This prevents errors when settlement-label doesn't exist yet
 */
function safeAddLayer(layerConfig, beforeId = 'settlement-label') {
  if (!map) {
    console.warn('Map not initialized');
    return false;
  }

  try {
    // Check if the map style is loaded
    if (!map.isStyleLoaded()) {
      console.warn('Map style not loaded yet, cannot add layer');
      return false;
    }

    // If beforeId is specified, check if that layer exists
    if (beforeId && map.getLayer(beforeId)) {
      map.addLayer(layerConfig, beforeId);
    } else {
      // Add without beforeId if the target layer doesn't exist
      map.addLayer(layerConfig);
    }
    return true;
  } catch (error) {
    console.error('Error adding layer:', error);
    return false;
  }
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize map on page load
 */
async function initializeLocation() {
  try {
    // Fetch Mapbox token from backend
    await fetchMapboxToken();

    // Initialize Mapbox map
    initializeMap();

    // Load patient's location
    await loadPatientLocation();

    // Start auto-refresh interval
    refreshInterval = setInterval(loadPatientLocation, CONFIG.LOCATION_REFRESH_INTERVAL);

    // Location history will be loaded after map finishes loading (see map.on('load') handler)

    console.log('✅ Location tracking initialized');
  } catch (error) {
    console.error('❌ Initialization error:', error);
    showError('Failed to initialize location tracking');
  }
}

/**
 * Fetch Mapbox token from backend
 */
async function fetchMapboxToken() {
  try {
    const response = await fetch('/api/config/mapbox', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    MAPBOX_TOKEN = data.token;

    if (!MAPBOX_TOKEN) {
      throw new Error('Mapbox token not provided by server');
    }

    console.log('✅ Mapbox token fetched');
  } catch (error) {
    console.error('❌ Failed to fetch Mapbox token:', error);
    throw error;
  }
}

/**
 * Initialize Mapbox map
 */
function initializeMap() {
  if (!MAPBOX_TOKEN) {
    showError('Mapbox token not available');
    return;
  }

  mapboxgl.accessToken = MAPBOX_TOKEN;

  map = new mapboxgl.Map({
    container: 'map',
    style: CONFIG.MAP_STYLE,
    center: [CONFIG.DEFAULT_LNG, CONFIG.DEFAULT_LAT],
    zoom: CONFIG.DEFAULT_ZOOM,
    attributionControl: true
  });

  // Add controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');

  // Add scale
  map.addControl(new mapboxgl.ScaleControl());

  // Wait for map to load before adding sources and layers
  map.on('load', () => {
    console.log('✅ Mapbox map loaded');
    // Wait a moment to ensure style is fully loaded
    setTimeout(() => {
      if (map.isStyleLoaded()) {
        loadLocationHistory();
      }
    }, 100);
  });

  // Additional safety: listen for style load event
  map.on('styledata', () => {
    // Style has loaded or changed
    if (map.isStyleLoaded()) {
      console.log('✅ Map style fully loaded');
    }
  });
}

// ============================================
// LOCATION LOADING
// ============================================

/**
 * Load patient's current location from server
 */
async function loadPatientLocation() {
  try {
    const response = await fetch('/api/location/patient', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.location) {
      patientData = data;
      displayLocation(data.location, data.patient);
      hideError();
    } else {
      showNoLocationMessage();
    }
  } catch (error) {
    console.error('❌ Failed to load location:', error);
    showError('Unable to load patient location. Please check your connection.');
  }
}

/**
 * Load location history (last 24 hours)
 */
async function loadLocationHistory() {
  try {
    const response = await fetch('/api/location/history', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.locations && data.locations.length > 0) {
      drawLocationHistory(data.locations);
      console.log(`✅ Loaded ${data.locations.length} location points`);
    }
  } catch (error) {
    console.error('⚠️ Failed to load location history:', error);
    // Non-critical error, don't show to user
  }
}

/**
 * Display current location on map
 */
function displayLocation(location, patient) {
  const { latitude, longitude, accuracy, timestamp } = location;

  // Show location info panel
  const locationInfoEl = document.getElementById('locationInfo');
  if (locationInfoEl) {
    locationInfoEl.style.display = 'grid';
  }

  // Display coordinates
  const latEl = document.getElementById('latitude');
  if (latEl) {
    latEl.textContent = latitude.toFixed(6);
  }
  
  const lngEl = document.getElementById('longitude');
  if (lngEl) {
    lngEl.textContent = longitude.toFixed(6);
  }
  
  const accEl = document.getElementById('accuracy');
  if (accEl) {
    accEl.textContent = accuracy ? `±${Math.round(accuracy)}m` : 'Unknown';
  }

  // Display relative timestamp
  const timeText = getRelativeTime(new Date(timestamp));
  const timestampEl = document.getElementById('timestamp');
  if (timestampEl) {
    timestampEl.textContent = timeText;
  }

  // Update status indicator
  updateStatusIndicator(timestamp);

  // Update patient name
  if (patient && patient.name) {
    const patientNameEl = document.getElementById('patientName');
    if (patientNameEl) {
      patientNameEl.textContent = patient.name;
    }
  }

  const lastUpdateEl = document.getElementById('lastUpdate');
  if (lastUpdateEl) {
    lastUpdateEl.textContent = `Last seen ${timeText}`;
  }

  // Update map
  updateMapDisplay(latitude, longitude, accuracy);

  console.log(`✅ Location displayed: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
}


/**
 * Update map with patient location marker and accuracy circle
 */
function updateMapDisplay(lat, lng, accuracy) {
  if (!map) return;

  // Remove old marker
  if (marker) {
    marker.remove();
  }

  // Create custom marker element
  const markerEl = document.createElement('div');
  markerEl.style.cssText = `
    width: ${CONFIG.MARKER_SIZE}px;
    height: ${CONFIG.MARKER_SIZE}px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 16px;
    font-weight: bold;
  `;
  markerEl.innerHTML = '📍';

  // Add marker to map
  marker = new mapboxgl.Marker(markerEl, { offset: [0, -16] })
    .setLngLat([lng, lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25, closeButton: true })
        .setHTML(`
          <div style="padding: 12px; font-size: 14px;">
            <strong style="display: block; margin-bottom: 8px;">Patient Location</strong>
            <div style="margin-bottom: 6px;">
              <strong>Latitude:</strong> ${lat.toFixed(6)}<br>
              <strong>Longitude:</strong> ${lng.toFixed(6)}<br>
              ${accuracy ? `<strong>Accuracy:</strong> ±${Math.round(accuracy)}m` : ''}
            </div>
            <small style="color: #666;">Last updated: ${new Date().toLocaleTimeString()}</small>
          </div>
        `)
    )
    .addTo(map);

  // Add accuracy circle
  if (accuracy && accuracy < 5000) {
    addAccuracyCircle(lat, lng, accuracy);
  }

  // Fly to location
  map.flyTo({
    center: [lng, lat],
    zoom: CONFIG.DEFAULT_ZOOM,
    duration: 1000,
    essential: true
  });
}

/**
 * Add accuracy circle to map
 */
function addAccuracyCircle(lat, lng, radiusInMeters) {
  if (!map) return;

  // Remove old circle
  if (map.getSource('accuracy-circle')) {
    if (map.getLayer('accuracy-circle-fill')) {
      map.removeLayer('accuracy-circle-fill');
    }
    if (map.getLayer('accuracy-circle-stroke')) {
      map.removeLayer('accuracy-circle-stroke');
    }
    map.removeSource('accuracy-circle');
  }

  // Convert meters to degrees (approximate)
  const radiusInDegrees = radiusInMeters / 111000;

  // Create circle source
  map.addSource('accuracy-circle', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lng, lat]
      }
    }
  });

  // Add circle fill layer - use safe helper function
  const fillLayerConfig = {
    id: 'accuracy-circle-fill',
    type: 'circle',
    source: 'accuracy-circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, radiusInMeters / 50, 20, radiusInMeters / 20],
      'circle-color': CONFIG.CIRCLE_COLOR,
      'circle-opacity': CONFIG.CIRCLE_OPACITY
    }
  };

  safeAddLayer(fillLayerConfig, 'settlement-label');

  // Add circle stroke layer
  safeAddLayer({
    id: 'accuracy-circle-stroke',
    type: 'circle',
    source: 'accuracy-circle',
    paint: {
      'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, radiusInMeters / 50, 20, radiusInMeters / 20],
      'circle-color': 'transparent',
      'circle-stroke-width': 2,
      'circle-stroke-color': CONFIG.CIRCLE_STROKE_COLOR,
      'circle-stroke-opacity': CONFIG.CIRCLE_STROKE_OPACITY
    }
  }, 'settlement-label');

  console.log(`✅ Accuracy circle added: ${radiusInMeters.toFixed(0)}m radius`);
}

/**
 * Draw location history path on map
 */
function drawLocationHistory(locations) {
  if (!map || locations.length === 0) return;

  // Convert locations to GeoJSON LineString
  const coordinates = locations.map(loc => [loc.longitude, loc.latitude]);

  // Remove old route
  if (map.getSource('location-route')) {
    if (map.getLayer('location-route')) {
      map.removeLayer('location-route');
    }
    map.removeSource('location-route');
  }

  // Add route source
  map.addSource('location-route', {
    type: 'geojson',
    data: {
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: coordinates.reverse() // Reverse to show chronological order
      }
    }
  });

  // Add route layer using safe helper function
  const layerConfig = {
    id: 'location-route',
    type: 'line',
    source: 'location-route',
    paint: {
      'line-color': '#667eea',
      'line-width': 3,
      'line-opacity': 0.6,
      'line-dasharray': [5, 5]
    }
  };

  safeAddLayer(layerConfig, 'settlement-label');

  console.log(`✅ Location history path drawn with ${locations.length} points`);
}

/**
 * Update status indicator based on last update time
 */
function updateStatusIndicator(timestamp) {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');

  const now = new Date();
  const lastUpdate = new Date(timestamp);
  const diffMinutes = Math.floor((now - lastUpdate) / 60000);

  if (diffMinutes < 2) {
    statusIndicator.className = 'status-indicator active';
    statusText.textContent = '🟢 Active Now';
    statusText.style.color = '#065f46';
  } else if (diffMinutes < 5) {
    statusIndicator.className = 'status-indicator active';
    statusText.textContent = '🟡 Active Recently';
    statusText.style.color = '#92400e';
  } else if (diffMinutes < 30) {
    statusIndicator.className = 'status-indicator inactive';
    statusText.textContent = '⚪ Inactive';
    statusText.style.color = '#6b7280';
  } else {
    statusIndicator.className = 'status-indicator offline';
    statusText.textContent = '⚫ Offline';
    statusText.style.color = '#7c3aed';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get relative time string (e.g., "5 minutes ago")
 */
function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMinutes < 1) {
    return 'Just now';
  } else if (diffMinutes < 60) {
    return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleString();
  }
}

/**
 * Show no location message
 */
function showNoLocationMessage() {
  document.getElementById('locationInfo').style.display = 'none';
  document.getElementById('statusIndicator').className = 'status-indicator offline';
  document.getElementById('statusText').textContent = '⚫ No Location Data';
  document.getElementById('lastUpdate').textContent = 'Patient has not shared their location yet';

  showError('Patient has not shared their location yet. Please ask them to enable location sharing.');
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  } else {
    console.error('Error:', message);
  }
}

/**
 * Hide error message
 */
function hideError() {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

/**
 * Refresh location manually (button click)
 */
async function refreshLocation() {
  const btn = document.querySelector('.refresh-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '🔄 Refreshing...';
  }

  try {
    await loadPatientLocation();
    await loadLocationHistory();
    showSuccessMessage('Location updated');
  } catch (error) {
    showError('Failed to refresh location');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔄 Refresh';
    }
  }
}

/**
 * Show success message
 */
function showSuccessMessage(message) {
  const alertEl = document.createElement('div');
  alertEl.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: #d1fae5;
    color: #065f46;
    padding: 12px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    z-index: 10000;
    animation: slideIn 0.3s ease-out;
  `;
  alertEl.textContent = '✅ ' + message;

  document.body.appendChild(alertEl);

  // Auto-remove after 3 seconds
  setTimeout(() => {
    alertEl.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => alertEl.remove(), 300);
  }, 3000);
}

/**
 * Pan map to location
 */
function panToLocation() {
  if (patientData && patientData.location) {
    const { latitude, longitude } = patientData.location;
    if (map) {
      map.flyTo({
        center: [longitude, latitude],
        zoom: 15,
        duration: 800,
        essential: true
      });
    }
  }
}

// ============================================
// EVENT LISTENERS
document.addEventListener('DOMContentLoaded', function() {
  // Safe zone button is handled by the inline script in location.html
  // which replaces this button's listener after map initialisation.
  // This block intentionally left minimal to avoid conflicts.
});
// ============================================

document.addEventListener('DOMContentLoaded', initializeLocation);

// Safe zone form logic
// Safe zone form logic removed as requested

// Refresh location when window regains focus
window.addEventListener('focus', async () => {
  console.log('🔍 Window focused, refreshing location...');
  await loadPatientLocation();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (marker) {
    marker.remove();
  }
});

// Expose functions globally
window.refreshLocation = refreshLocation;
window.panToLocation = panToLocation;