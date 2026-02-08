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

    // Load location history
    await loadLocationHistory();

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

  // Wait for map to load before adding sources
  map.on('load', () => {
    console.log('✅ Mapbox map loaded');
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
  document.getElementById('locationInfo').style.display = 'grid';

  // Display coordinates
  document.getElementById('latitude').textContent = latitude.toFixed(6);
  document.getElementById('longitude').textContent = longitude.toFixed(6);
  document.getElementById('accuracy').textContent = accuracy
    ? `±${Math.round(accuracy)}m`
    : 'Unknown';

  // Display relative timestamp
  const timeText = getRelativeTime(new Date(timestamp));
  document.getElementById('timestamp').textContent = timeText;

  // Update status indicator
  updateStatusIndicator(timestamp);

  // Update patient name
  if (patient && patient.name) {
    document.getElementById('patientName').textContent = patient.name;
  }

  document.getElementById('lastUpdate').textContent = `Last seen ${timeText}`;

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

  // Add circle fill layer
  map.addLayer(
    {
      id: 'accuracy-circle-fill',
      type: 'circle',
      source: 'accuracy-circle',
      paint: {
        'circle-radius': ['interpolate', ['linear'], ['zoom'], 10, radiusInMeters / 50, 20, radiusInMeters / 20],
        'circle-color': CONFIG.CIRCLE_COLOR,
        'circle-opacity': CONFIG.CIRCLE_OPACITY
      }
    },
    'settlement-label'
  );

  // Add circle stroke layer
  map.addLayer({
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
  });

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

  // Add route layer
  map.addLayer(
    {
      id: 'location-route',
      type: 'line',
      source: 'location-route',
      paint: {
        'line-color': '#667eea',
        'line-width': 3,
        'line-opacity': 0.6,
        'line-dasharray': [5, 5]
      }
    },
    'settlement-label'
  );

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
// ============================================

document.addEventListener('DOMContentLoaded', initializeLocation);

// Refresh location when window regains focus
window.addEventListener('focus', async () => {
  console.log('📍 Window focused, refreshing location...');
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