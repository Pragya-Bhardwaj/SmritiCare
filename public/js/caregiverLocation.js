// public/js/caregiverLocation.js

let map;
let marker;
let refreshInterval;
// Replace the hardcoded token with:
let MAPBOX_TOKEN = '';

// Fetch token before initializing
async function fetchMapboxToken() {
  const res = await fetch('/api/config/mapbox');
  const data = await res.json();
  MAPBOX_TOKEN = data.token;
}

document.addEventListener('DOMContentLoaded', async () => {
  await fetchMapboxToken();
  initializeMap();
  loadPatientLocation();
  refreshInterval = setInterval(loadPatientLocation, 30000);
});

// Initialize map and load location


// Cleanup on page unload
window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
});

/**
 * Initialize Mapbox map
 */
function initializeMap() {
  mapboxgl.accessToken = MAPBOX_TOKEN;
  
  map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [77.1025, 28.7041], // Default: New Delhi, India
    zoom: 12
  });

  // Add navigation controls
  map.addControl(new mapboxgl.NavigationControl(), 'top-right');

  // Add fullscreen control
  map.addControl(new mapboxgl.FullscreenControl(), 'top-right');
}

/**
 * Load patient's current location
 */
async function loadPatientLocation() {
  try {
    const res = await fetch('/api/location/patient', {
      credentials: 'include'
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const data = await res.json();

    if (data.location) {
      displayLocation(data.location, data.patient);
      hideError();
    } else {
      showNoLocationMessage();
    }

  } catch (err) {
    console.error('Failed to load location:', err);
    showError('Unable to load patient location. Please check connection.');
  }
}

/**
 * Display location on map
 */
function displayLocation(location, patient) {
  const { latitude, longitude, accuracy, timestamp } = location;

  // Show location info
  document.getElementById('locationInfo').style.display = 'grid';
  document.getElementById('latitude').textContent = latitude.toFixed(6);
  document.getElementById('longitude').textContent = longitude.toFixed(6);
  document.getElementById('accuracy').textContent = accuracy 
    ? `${Math.round(accuracy)}m` 
    : 'Unknown';
  
  // Format timestamp
  const time = new Date(timestamp);
  const now = new Date();
  const diffMinutes = Math.floor((now - time) / 60000);
  
  let timeText;
  if (diffMinutes < 1) {
    timeText = 'Just now';
  } else if (diffMinutes < 60) {
    timeText = `${diffMinutes} min ago`;
  } else {
    const hours = Math.floor(diffMinutes / 60);
    timeText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }
  
  document.getElementById('timestamp').textContent = timeText;

  // Update status indicator
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  
  if (diffMinutes < 5) {
    statusIndicator.className = 'status-indicator active';
    statusText.textContent = 'Active';
  } else {
    statusIndicator.className = 'status-indicator inactive';
    statusText.textContent = 'Inactive';
  }

  // Update patient name
  if (patient && patient.name) {
    document.getElementById('patientName').textContent = patient.name;
  }

  document.getElementById('lastUpdate').textContent = `Last seen ${timeText}`;

  // Update map
  updateMap(latitude, longitude, accuracy);
}

/**
 * Update map with patient location
 */
function updateMap(lat, lng, accuracy) {
  // Remove existing marker if any
  if (marker) {
    marker.remove();
  }

  // Create custom marker element
  const el = document.createElement('div');
  el.className = 'custom-marker';
  el.style.backgroundImage = 'url(https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png)';
  el.style.width = '32px';
  el.style.height = '40px';
  el.style.backgroundSize = '100%';

  // Add marker
  marker = new mapboxgl.Marker(el)
    .setLngLat([lng, lat])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 8px;">
            <strong>Current Location</strong><br>
            <small>Lat: ${lat.toFixed(6)}</small><br>
            <small>Lng: ${lng.toFixed(6)}</small>
            ${accuracy ? `<br><small>Accuracy: ${Math.round(accuracy)}m</small>` : ''}
          </div>
        `)
    )
    .addTo(map);

  // Add accuracy circle if available
  if (accuracy && accuracy < 1000) {
    // Convert meters to approximate degrees
    const radiusInDegrees = accuracy / 111320;

    if (map.getSource('accuracy-circle')) {
      map.removeLayer('accuracy-circle-layer');
      map.removeSource('accuracy-circle');
    }

    map.addSource('accuracy-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [lng, lat]
        },
        properties: {
          radius: radiusInDegrees
        }
      }
    });

    map.addLayer({
      id: 'accuracy-circle-layer',
      type: 'circle',
      source: 'accuracy-circle',
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, radiusInDegrees * 100000]
          ],
          base: 2
        },
        'circle-color': '#667eea',
        'circle-opacity': 0.2,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#667eea',
        'circle-stroke-opacity': 0.4
      }
    });
  }

  // Center map on location
  map.flyTo({
    center: [lng, lat],
    zoom: 15,
    essential: true
  });
}

/**
 * Show no location message
 */
function showNoLocationMessage() {
  document.getElementById('locationInfo').style.display = 'none';
  document.getElementById('statusIndicator').className = 'status-indicator inactive';
  document.getElementById('statusText').textContent = 'No Data';
  document.getElementById('lastUpdate').textContent = 'No location data available yet';
  
  showError('Patient has not shared their location yet.');
}

/**
 * Refresh location manually
 */
function refreshLocation() {
  const btn = document.querySelector('.refresh-btn');
  btn.disabled = true;
  btn.textContent = '🔄 Refreshing...';
  
  loadPatientLocation().finally(() => {
    btn.disabled = false;
    btn.textContent = '🔄 Refresh';
  });
}

/**
 * Show error message
 */
function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  errorEl.textContent = message;
  errorEl.style.display = 'block';
}

/**
 * Hide error message
 */
function hideError() {
  document.getElementById('errorMessage').style.display = 'none';
}