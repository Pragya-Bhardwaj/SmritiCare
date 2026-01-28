// controllers/locationController.js
const Location = require("../models/Location");
const User = require("../models/User");

/**
 * Update patient's current location
 * Called by patient's device periodically
 */
exports.updateLocation = async (req, res) => {
  try {
    const { latitude, longitude, accuracy } = req.body;

    // Validate input
    if (!latitude || !longitude) {
      return res.status(400).json({
        error: "Validation error",
        message: "Latitude and longitude are required"
      });
    }

    // Validate coordinates
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid coordinates"
      });
    }

    const userId = req.session.user.id;

    // Create new location record
    const location = await Location.create({
      userId,
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      accuracy: accuracy ? parseFloat(accuracy) : null,
      timestamp: new Date()
    });

    res.json({
      success: true,
      location: {
        latitude,
        longitude,
        accuracy,
        timestamp: location.timestamp
      }
    });

  } catch (err) {
    console.error("Update location error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to update location"
    });
  }
};

/**
 * Get latest location of linked patient
 * Used by caregiver to track patient
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

    if (!patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You are not linked to a patient"
      });
    }

    // Get latest location
    const location = await Location.findOne({ userId: patientId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!location) {
      return res.json({
        success: true,
        location: null,
        message: "No location data available"
      });
    }

    // Get patient info
    const patient = await User.findById(patientId).select('name');

    res.json({
      success: true,
      location: {
        latitude: location.coordinates.coordinates[1],
        longitude: location.coordinates.coordinates[0],
        accuracy: location.accuracy,
        timestamp: location.timestamp,
        address: location.address
      },
      patient: {
        name: patient.name
      }
    });

  } catch (err) {
    console.error("Get patient location error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch location"
    });
  }
};

/**
 * Get location history (last 24 hours)
 */
exports.getLocationHistory = async (req, res) => {
  try {
    const { role, id, patientId } = req.session.user;

    let targetUserId;

    if (role === "caregiver") {
      if (!patientId) {
        return res.status(400).json({
          error: "Not linked",
          message: "You are not linked to a patient"
        });
      }
      targetUserId = patientId;
    } else {
      targetUserId = id;
    }

    // Get last 24 hours of location data
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const locations = await Location.find({
      userId: targetUserId,
      timestamp: { $gte: yesterday }
    })
    .sort({ timestamp: -1 })
    .limit(100);

    const formattedLocations = locations.map(loc => ({
      latitude: loc.coordinates.coordinates[1],
      longitude: loc.coordinates.coordinates[0],
      accuracy: loc.accuracy,
      timestamp: loc.timestamp
    }));

    res.json({
      success: true,
      count: formattedLocations.length,
      locations: formattedLocations
    });

  } catch (err) {
    console.error("Get location history error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch location history"
    });
  }
};