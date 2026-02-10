/**
 * caregiverLocation.js - Enhanced with Safe Zone Management
 * Real-time location display with safe zone configuration
 */

let map;
let marker;
let safeZoneCircle;
let safeZoneMarker;
let geocoder;
let refreshInterval;
let MAPBOX_TOKEN = '';
let patientData = null;
let currentSafeZone = null;

// Configuration
const CONFIG = {
  DEFAULT_LAT: 28.7041,
  DEFAULT_LNG: 77.1025,
  DEFAULT_ZOOM: 12,
  LOCATION_REFRESH_INTERVAL: 30000,
  MAP_STYLE: 'mapbox://styles/mapbox/streets-v12',
  MARKER_SIZE: 32,
  SAFE_ZONE_COLOR: '#3b82f6',
  SAFE_ZONE_OPACITY: 0.2,
  SAFE_ZONE_STROKE_COLOR: '#3b82f6',
  SAFE_ZONE_STROKE_OPACITY: 0.8
};

// ============================================
// INITIALIZATION
// ============================================

async function initializeLocation() {
  try {
    await fetchMapboxToken();
    initializeMap();
    await loadSafeZone();
    await loadPatientLocation();
    
    refreshInterval = setInterval(loadPatientLocation, CONFIG.LOCATION_REFRESH_INTERVAL);

    console.log('✅ Location tracking initialized with safe zone support');
  } catch (error) {
    console.error('❌ Initialization error:', error);
    showError('Failed to initialize location tracking');
  }
}

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
  map.addControl(new mapboxgl.ScaleControl());

  // Initialize geocoder for address search
  geocoder = new MapboxGeocoder({
    accessToken: MAPBOX_TOKEN,
    mapboxgl: mapboxgl,
    placeholder: 'Search for safe zone address...',
    marker: false
  });

  document.getElementById('geocoder').appendChild(geocoder.onAdd(map));

  // Handle address selection
  geocoder.on('result', (e) => {
    const { center, place_name } = e.result;
    document.getElementById('safeZoneAddress').value = place_name;
    document.getElementById('safeZoneLongitude').value = center[0];
    document.getElementById('safeZoneLatitude').value = center[1];
  });

  map.on('load', () => {
    console.log('✅ Mapbox map loaded');
  });
}

// ============================================
// SAFE ZONE MANAGEMENT
// ============================================

async function loadSafeZone() {
  try {
    const response = await fetch('/api/location/safe-zone', {
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.safeZone) {
      currentSafeZone = data.safeZone;
      displaySafeZone(data.safeZone);
      populateSafeZoneForm(data.safeZone);
      
      console.log('✅ Safe zone loaded');
    } else {
      console.log('ℹ️ No safe zone configured');
    }
  } catch (error) {
    console.error('❌ Failed to load safe zone:', error);
  }
}

function displaySafeZone(safeZone) {
  if (!map) return;

  // Remove existing safe zone visualizations
  removeSafeZoneFromMap();

  const { latitude, longitude, radius, name, address } = safeZone;

  // Add safe zone marker
  const el = document.createElement('div');
  el.style.cssText = `
    width: 40px;
    height: 40px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    border: 4px solid white;
    border-radius: 50%;
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;
    font-size: 20px;
    font-weight: bold;
  `;
  el.innerHTML = '🛡️';

  safeZoneMarker = new mapboxgl.Marker(el)
    .setLngLat([longitude, latitude])
    .setPopup(
      new mapboxgl.Popup({ offset: 25 })
        .setHTML(`
          <div style="padding: 12px; font-size: 14px;">
            <strong style="display: block; margin-bottom: 8px; font-size: 16px;">🛡️ Safe Zone</strong>
            <div style="margin-bottom: 6px;">
              <strong>Name:</strong> ${name}<br>
              <strong>Address:</strong> ${address}<br>
              <strong>Radius:</strong> ${radius}m
            </div>
            <small style="color: #666;">Patient will be monitored within this zone</small>
          </div>
        `)
    )
    .addTo(map);

  // Add safe zone circle
  if (!map.getSource('safe-zone-circle')) {
    map.addSource('safe-zone-circle', {
      type: 'geojson',
      data: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        properties: {
          radius: radius
        }
      }
    });

    // Add fill layer
    map.addLayer({
      id: 'safe-zone-fill',
      type: 'circle',
      source: 'safe-zone-circle',
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, metersToPixelsAtMaxZoom(radius, latitude)]
          ],
          base: 2
        },
        'circle-color': CONFIG.SAFE_ZONE_COLOR,
        'circle-opacity': CONFIG.SAFE_ZONE_OPACITY
      }
    });

    // Add stroke layer
    map.addLayer({
      id: 'safe-zone-stroke',
      type: 'circle',
      source: 'safe-zone-circle',
      paint: {
        'circle-radius': {
          stops: [
            [0, 0],
            [20, metersToPixelsAtMaxZoom(radius, latitude)]
          ],
          base: 2
        },
        'circle-color': 'transparent',
        'circle-stroke-width': 3,
        'circle-stroke-color': CONFIG.SAFE_ZONE_STROKE_COLOR,
        'circle-stroke-opacity': CONFIG.SAFE_ZONE_STROKE_OPACITY
      }
    });
  }

  // Update safe zone display
  document.getElementById('safeZoneDisplay').style.display = 'block';
  document.getElementById('displayZoneName').textContent = name;
  document.getElementById('displayZoneAddress').textContent = address;
  document.getElementById('displayZoneRadius').textContent = `${radius}m`;
  document.getElementById('deleteSafeZoneBtn').style.display = 'inline-block';
  document.getElementById('panToSafeZoneBtn').style.display = 'inline-block';

  console.log(`✅ Safe zone displayed: ${name} (${radius}m)`);
}

function populateSafeZoneForm(safeZone) {
  document.getElementById('safeZoneName').value = safeZone.name;
  document.getElementById('safeZoneAddress').value = safeZone.address;
  document.getElementById('safeZoneLatitude').value = safeZone.latitude;
  document.getElementById('safeZoneLongitude').value = safeZone.longitude;
  document.getElementById('safeZoneRadius').value = safeZone.radius;
}

function removeSafeZoneFromMap() {
  if (safeZoneMarker) {
    safeZoneMarker.remove();
    safeZoneMarker = null;
  }

  if (map && map.getSource('safe-zone-circle')) {
    if (map.getLayer('safe-zone-fill')) map.removeLayer('safe-zone-fill');
    if (map.getLayer('safe-zone-stroke')) map.removeLayer('safe-zone-stroke');
    map.removeSource('safe-zone-circle');
  }
}

// Helper: Convert meters to pixels at max zoom
function metersToPixelsAtMaxZoom(meters, latitude) {
  return meters / 0.075 / Math.cos(latitude * Math.PI / 180);
}

// ============================================
// SAFE ZONE FORM HANDLERS
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('safeZoneForm');
  
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveSafeZone();
  });

  document.getElementById('deleteSafeZoneBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete the safe zone? You will no longer receive alerts if the patient leaves this area.')) {
      await deleteSafeZone();
    }
  });
});

async function saveSafeZone() {
  const name = document.getElementById('safeZoneName').value.trim();
  const address = document.getElementById('safeZoneAddress').value.trim();
  const latitude = document.getElementById('safeZoneLatitude').value;
  const longitude = document.getElementById('safeZoneLongitude').value;
  const radius = parseInt(document.getElementById('safeZoneRadius').value);

  if (!name || !address || !latitude || !longitude) {
    alert('Please fill in all fields and select an address from the search');
    return;
  }

  const btn = document.getElementById('saveSafeZoneBtn');
  btn.disabled = true;
  btn.textContent = '💾 Saving...';

  try {
    const response = await fetch('/api/location/safe-zone', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        name,
        address,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radius
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      currentSafeZone = data.safeZone;
      displaySafeZone(data.safeZone);
      showSuccess('Safe zone saved successfully! Email alerts are now active.');
      
      // Pan to safe zone
      map.flyTo({
        center: [data.safeZone.longitude, data.safeZone.latitude],
        zoom: 14,
        duration: 1000
      });
    } else {
      throw new Error(data.message || 'Failed to save safe zone');
    }
  } catch (error) {
    console.error('❌ Save safe zone error:', error);
    alert('Failed to save safe zone. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Save Safe Zone';
  }
}

async function deleteSafeZone() {
  const btn = document.getElementById('deleteSafeZoneBtn');
  btn.disabled = true;
  btn.textContent = '🗑️ Deleting...';

  try {
    const response = await fetch('/api/location/safe-zone', {
      method: 'DELETE',
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      currentSafeZone = null;
      removeSafeZoneFromMap();
      
      // Clear form
      document.getElementById('safeZoneForm').reset();
      document.getElementById('safeZoneLatitude').value = '';
      document.getElementById('safeZoneLongitude').value = '';
      
      // Hide display
      document.getElementById('safeZoneDisplay').style.display = 'none';
      document.getElementById('deleteSafeZoneBtn').style.display = 'none';
      document.getElementById('panToSafeZoneBtn').style.display = 'none';
      document.getElementById('safeZoneDistanceCard').style.display = 'none';
      
      showSuccess('Safe zone deleted. Email alerts are now disabled.');
    } else {
      throw new Error(data.message || 'Failed to delete safe zone');
    }
  } catch (error) {
    console.error('❌ Delete safe zone error:', error);
    alert('Failed to delete safe zone. Please try again.');
  } finally {
    btn.disabled = false;
    btn.textContent = '🗑️ Delete Safe Zone';
  }
}

function panToSafeZone() {
  if (currentSafeZone) {
    map.flyTo({
      center: [currentSafeZone.longitude, currentSafeZone.latitude],
      zoom: 15,
      duration: 800
    });
  }
}

// ============================================
// LOCATION LOADING
// ============================================

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
      displayLocation(data.location, data.patient, data.safeZoneStatus);
      hideError();
    } else {
      showNoLocationMessage();
    }
  } catch (error) {
    console.error('❌ Failed to load location:', error);
    showError('Unable to load patient location. Please check your connection.');
  }
}

function displayLocation(location, patient, safeZoneStatus) {
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
  updateStatusIndicator(timestamp, safeZoneStatus);

  // Update patient name
  if (patient && patient.name) {
    document.getElementById('patientName').textContent = patient.name;
  }

  document.getElementById('lastUpdate').textContent = `Last seen ${timeText}`;

  // Display safe zone status
  if (safeZoneStatus) {
    const card = document.getElementById('safeZoneDistanceCard');
    const distanceEl = document.getElementById('safeZoneDistance');
    const labelEl = document.getElementById('safeZoneDistanceLabel');
    
    card.style.display = 'block';
    
    if (safeZoneStatus.isInside) {
      card.classList.remove('warning');
      card.classList.add('success');
      distanceEl.textContent = `${safeZoneStatus.distanceFromEdge}m`;
      labelEl.textContent = 'Inside safe zone';
      distanceEl.style.color = '#10b981';
    } else {
      card.classList.remove('success');
      card.classList.add('warning');
      distanceEl.textContent = `${safeZoneStatus.distanceFromEdge}m`;
      labelEl.textContent = '⚠️ Outside safe zone';
      distanceEl.style.color = '#ef4444';
    }
  }

  // Update map
  updateMapDisplay(latitude, longitude, accuracy);

  console.log(`✅ Location displayed: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
}

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

  // Fly to location
  map.flyTo({
    center: [lng, lat],
    zoom: CONFIG.DEFAULT_ZOOM,
    duration: 1000,
    essential: true
  });
}

function updateStatusIndicator(timestamp, safeZoneStatus) {
  const statusIndicator = document.getElementById('statusIndicator');
  const statusText = document.getElementById('statusText');
  const safeZoneBadge = document.getElementById('safeZoneBadge');

  const now = new Date();
  const lastUpdate = new Date(timestamp);
  const diffMinutes = Math.floor((now - lastUpdate) / 60000);

  // Location status
  if (diffMinutes < 2) {
    statusIndicator.className = 'status-indicator active';
    statusText.textContent = '🟢 Active Now';
    statusText.style.color = '#065f46';
  } else if (diffMinutes < 5) {
    statusIndicator.className = 'status-indicator active';
    statusText.textContent = '🟡 Active Recently';
    statusText.style.color = '#92400e';
  } else {
    statusIndicator.className = 'status-indicator inactive';
    statusText.textContent = '⚪ Inactive';
    statusText.style.color = '#6b7280';
  }

  // Safe zone badge
  if (safeZoneStatus) {
    if (safeZoneStatus.isInside) {
      safeZoneBadge.className = 'safe-zone-badge inside';
      safeZoneBadge.innerHTML = '🛡️ Inside Safe Zone';
    } else {
      safeZoneBadge.className = 'safe-zone-badge outside';
      safeZoneBadge.innerHTML = '⚠️ Outside Safe Zone';
    }
  } else {
    safeZoneBadge.innerHTML = '';
    safeZoneBadge.className = '';
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

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

function showNoLocationMessage() {
  document.getElementById('locationInfo').style.display = 'none';
  document.getElementById('statusIndicator').className = 'status-indicator offline';
  document.getElementById('statusText').textContent = '⚫ No Location Data';
  document.getElementById('lastUpdate').textContent = 'Patient has not shared their location yet';

  showError('Patient has not shared their location yet. Please ask them to enable location sharing.');
}

function showError(message) {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

function hideError() {
  const errorEl = document.getElementById('errorMessage');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

function showSuccess(message) {
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

  setTimeout(() => {
    alertEl.style.animation = 'slideOut 0.3s ease-out forwards';
    setTimeout(() => alertEl.remove(), 300);
  }, 3000);
}

async function refreshLocation() {
  const btn = document.querySelector('.refresh-btn');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '🔄 Refreshing...';
  }

  try {
    await loadPatientLocation();
    showSuccess('Location updated');
  } catch (error) {
    showError('Failed to refresh location');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '🔄 Refresh';
    }
  }
}

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

window.addEventListener('focus', async () => {
  console.log('🔍 Window focused, refreshing location...');
  await loadPatientLocation();
});

window.addEventListener('beforeunload', () => {
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }
  if (marker) {
    marker.remove();
  }
  if (safeZoneMarker) {
    safeZoneMarker.remove();
  }
});

// Expose functions globally
window.refreshLocation = refreshLocation;
window.panToLocation = panToLocation;
window.panToSafeZone = panToSafeZone;