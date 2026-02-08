// controllers/locationController.js
const Location = require("../models/Location");
const User = require("../models/User");

/**
 * Update patient's current location
 * Called by patient's device periodically via background tracking
 * Stores location in database for caregiver to view
 */
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    // Validate input
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Validation error",
        message: "Latitude and longitude are required"
      });
    }

    // Validate coordinates
    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid coordinates. Latitude must be -90 to 90, Longitude must be -180 to 180"
      });
    }

    const userId = req.session.user.id;

    // Ensure user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not found"
      });
    }

    // Parse coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const acc = accuracy ? parseFloat(accuracy) : null;

    // Create new location record
    const location = await Location.create({
      userId,
      coordinates: {
        type: 'Point',
        coordinates: [lng, lat] // GeoJSON format: [longitude, latitude]
      },
      accuracy: acc,
      timestamp: new Date()
    });

    console.log(`✅ Location updated for user ${userId}: [${lat.toFixed(6)}, ${lng.toFixed(6)}]`);

    res.json({
      success: true,
      message: "Location updated successfully",
      location: {
        latitude: lat,
        longitude: lng,
        accuracy: acc,
        timestamp: location.timestamp
      }
    });

  } catch (err) {
    console.error("❌ Update location error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to update location"
    });
  }
};

/**
 * Get latest location of linked patient
 * Used by caregiver to view patient's current location
 * Only accessible to caregivers who are linked to the patient
 */
exports.getPatientLocation = async (req, res) => {
  try {
    const { role, patientId } = req.session.user;

    // Only caregivers can access this
    if (role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can access patient location"
      });
    }

    // Check if caregiver is linked to a patient
    if (!patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You are not linked to a patient"
      });
    }

    // Get latest location record
    const location = await Location.findOne({ userId: patientId })
      .sort({ timestamp: -1 })
      .limit(1)
      .lean();

    if (!location) {
      return res.json({
        success: true,
        location: null,
        message: "No location data available"
      });
    }

    // Get patient info
    const patient = await User.findById(patientId).select('name email').lean();

    if (!patient) {
      return res.status(404).json({
        error: "Not found",
        message: "Patient not found"
      });
    }

    // Extract coordinates from GeoJSON
    const [longitude, latitude] = location.coordinates.coordinates;

    console.log(`✅ Location retrieved for patient ${patientId}`);

    res.json({
      success: true,
      location: {
        latitude: latitude,
        longitude: longitude,
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        address: location.address || null
      },
      patient: {
        id: patient._id,
        name: patient.name,
        email: patient.email
      }
    });

  } catch (err) {
    console.error("❌ Get patient location error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch location"
    });
  }
};

/**
 * Get location history (last 24 hours or custom time range)
 * Shows path taken by patient over time
 * Accessible to both patient (own location) and caregiver (linked patient's location)
 */
exports.getLocationHistory = async (req, res) => {
  try {
    const { role, id, patientId } = req.session.user;
    const { hours = 24, limit = 100 } = req.query;

    let targetUserId;

    if (role === "caregiver") {
      if (!patientId) {
        return res.status(400).json({
          error: "Not linked",
          message: "You are not linked to a patient"
        });
      }
      targetUserId = patientId;
    } else if (role === "patient") {
      targetUserId = id;
    } else {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid user role"
      });
    }

    // Calculate time range
    const timeLimit = Math.min(parseInt(hours) || 24, 72); // Max 72 hours
    const startTime = new Date(Date.now() - timeLimit * 60 * 60 * 1000);
    const maxResults = Math.min(parseInt(limit) || 100, 500);

    // Get location history
    const locations = await Location.find({
      userId: targetUserId,
      timestamp: { $gte: startTime }
    })
      .sort({ timestamp: -1 })
      .limit(maxResults)
      .lean();

    // Format locations
    const formattedLocations = locations
      .reverse() // Reverse to show chronological order
      .map(loc => ({
        latitude: loc.coordinates.coordinates[1],
        longitude: loc.coordinates.coordinates[0],
        accuracy: loc.accuracy,
        timestamp: loc.timestamp
      }));

    console.log(`✅ Retrieved ${formattedLocations.length} location history points for user ${targetUserId}`);

    res.json({
      success: true,
      count: formattedLocations.length,
      timeRange: {
        start: startTime,
        end: new Date(),
        hours: timeLimit
      },
      locations: formattedLocations
    });

  } catch (err) {
    console.error("❌ Get location history error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch location history"
    });
  }
};

/**
 * Get distance traveled
 * Calculate total distance traveled in specified time range
 */
exports.getDistanceTraveled = async (req, res) => {
  try {
    const { role, id, patientId } = req.session.user;
    const { hours = 24 } = req.query;

    let targetUserId;

    if (role === "caregiver") {
      if (!patientId) {
        return res.status(400).json({
          error: "Not linked",
          message: "You are not linked to a patient"
        });
      }
      targetUserId = patientId;
    } else if (role === "patient") {
      targetUserId = id;
    } else {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid user role"
      });
    }

    // Calculate time range
    const timeLimit = Math.min(parseInt(hours) || 24, 72);
    const startTime = new Date(Date.now() - timeLimit * 60 * 60 * 1000);

    // Get locations
    const locations = await Location.find({
      userId: targetUserId,
      timestamp: { $gte: startTime }
    })
      .sort({ timestamp: 1 })
      .lean();

    if (locations.length < 2) {
      return res.json({
        success: true,
        distanceInMeters: 0,
        distanceInKm: 0,
        locationsCount: locations.length
      });
    }

    // Calculate total distance
    let totalDistance = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      const [lng1, lat1] = locations[i].coordinates.coordinates;
      const [lng2, lat2] = locations[i + 1].coordinates.coordinates;

      const distance = calculateHaversineDistance(lat1, lng1, lat2, lng2);
      totalDistance += distance;
    }

    console.log(`✅ Calculated distance for user ${targetUserId}: ${totalDistance.toFixed(2)}m`);

    res.json({
      success: true,
      distanceInMeters: Math.round(totalDistance),
      distanceInKm: (totalDistance / 1000).toFixed(2),
      locationsCount: locations.length,
      timeRange: {
        start: startTime,
        end: new Date(),
        hours: timeLimit
      }
    });

  } catch (err) {
    console.error("❌ Get distance traveled error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to calculate distance"
    });
  }
};

/**
 * Clear old location data (cleanup)
 * Keeps only last 7 days of location history
 */
exports.cleanupOldLocations = async (req, res) => {
  try {
    const daysToKeep = 7;
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

    const result = await Location.deleteMany({
      timestamp: { $lt: cutoffDate }
    });

    console.log(`✅ Deleted ${result.deletedCount} old location records`);

    res.json({
      success: true,
      message: `Deleted ${result.deletedCount} old location records`,
      cutoffDate
    });

  } catch (err) {
    console.error("❌ Cleanup locations error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to cleanup locations"
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate latitude and longitude coordinates
 */
function isValidCoordinate(latitude, longitude) {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  return (
    !isNaN(lat) &&
    !isNaN(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}