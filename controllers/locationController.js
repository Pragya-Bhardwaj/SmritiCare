/// controllers/locationController.js
const Location = require("../models/Location");
const SafeZone = require("../models/SafeZone");
const User = require("../models/User");
const nodemailer = require("nodemailer");

/* MAIL SETUP */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send safe zone alert email to caregiver
 */
async function sendSafeZoneAlert(caregiver, patient, distance, safeZone) {
  try {
    const alertTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    await transporter.sendMail({
      from: `"SmritiCare Alert" <${process.env.EMAIL_USER}>`,
      to: caregiver.email,
      subject: `🚨 ALERT: ${patient.name} has left their safe zone`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚨 Safe Zone Alert</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Patient has left their safe zone</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background: #f9fafb; border: 1px solid #e5e7eb;">
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #ef4444;">
              <h2 style="margin: 0 0 15px 0; color: #1e293b; font-size: 20px;">⚠️ Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Patient:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${patient.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Time:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${alertTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Safe Zone:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${safeZone.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Address:</td>
                  <td style="padding: 8px 0; color: #1e293b; font-weight: 600; font-size: 14px;">${safeZone.address}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #64748b; font-size: 14px;">Distance:</td>
                  <td style="padding: 8px 0; color: #ef4444; font-weight: 700; font-size: 16px;">${Math.round(distance)}m outside safe zone</td>
                </tr>
              </table>
            </div>

            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; color: #92400e; font-size: 14px; line-height: 1.6;">
                <strong>📍 What This Means:</strong><br>
                ${patient.name} is currently ${Math.round(distance)} meters away from their designated safe zone (${safeZone.name}). 
                This could indicate they have wandered away or left their usual area.
              </p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #1e293b; font-size: 16px;">✅ Recommended Actions:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #334155; line-height: 1.8; font-size: 14px;">
                <li>Check their current location on the SmritiCare dashboard</li>
                <li>Try calling ${patient.name} to confirm they're safe</li>
                <li>If you can't reach them, consider checking common locations</li>
                <li>Monitor their location for the next 15-30 minutes</li>
              </ul>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/caregiver/location" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                        color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                📍 View Live Location
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #1e293b; color: #94a3b8; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
            <p style="margin: 0 0 8px 0;">This is an automated alert from SmritiCare</p>
            <p style="margin: 0; opacity: 0.7;">
              You're receiving this because you're registered as the caregiver for ${patient.name}
            </p>
          </div>

        </div>
      `
    });

    console.log(`✅ Safe zone alert sent to ${caregiver.email}`);
  } catch (err) {
    console.error("❌ Failed to send safe zone alert:", err);
    throw new Error("Failed to send alert email");
  }
}

/**
 * Update patient's current location
 * Checks safe zone and sends alert if needed
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

    // Check safe zone if patient is linked to a caregiver
    if (user.linked && user.linkedUser) {
      try {
        const safeZone = await SafeZone.findOne({ 
          patientId: userId,
          isActive: true 
        });

        if (safeZone) {
          const isInside = safeZone.isInsideSafeZone(lat, lng);
          
          if (!isInside) {
            // Patient is outside safe zone
            const [zoneLng, zoneLat] = safeZone.coordinates.coordinates;
            const distance = calculateDistance(zoneLat, zoneLng, lat, lng);
            const distanceOutside = distance - safeZone.radius;

            console.log(`⚠️ Patient outside safe zone by ${Math.round(distanceOutside)}m`);

            // Send alert if cooldown has passed
            if (safeZone.canSendAlert()) {
              const caregiver = await User.findById(user.linkedUser);
              const patient = user;

              if (caregiver && caregiver.email) {
                await sendSafeZoneAlert(caregiver, patient, distanceOutside, safeZone);
                
                // Update last alert time
                safeZone.lastAlertSent = new Date();
                await safeZone.save();

                console.log(`📧 Safe zone alert sent to caregiver`);
              }
            } else {
              console.log(`⏱️ Alert cooldown active, not sending alert`);
            }
          } else {
            console.log(`✅ Patient inside safe zone`);
          }
        }
      } catch (alertErr) {
        console.error("❌ Safe zone check error:", alertErr);
        // Don't fail location update if alert fails
      }
    }

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
 */
exports.getPatientLocation = async (req, res) => {
  try {
    const { role, patientId } = req.session.user;

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

    const patient = await User.findById(patientId).select('name email').lean();

    if (!patient) {
      return res.status(404).json({
        error: "Not found",
        message: "Patient not found"
      });
    }

    const [longitude, latitude] = location.coordinates.coordinates;

    // Get safe zone info
    const safeZone = await SafeZone.findOne({ 
      patientId,
      isActive: true 
    }).lean();

    let safeZoneStatus = null;
    if (safeZone) {
      const [zoneLng, zoneLat] = safeZone.coordinates.coordinates;
      const distance = calculateDistance(zoneLat, zoneLng, latitude, longitude);
      const isInside = distance <= safeZone.radius;
      
      safeZoneStatus = {
        isInside,
        distance: Math.round(distance),
        distanceFromEdge: Math.round(isInside ? safeZone.radius - distance : distance - safeZone.radius),
        safeZoneName: safeZone.name,
        safeZoneRadius: safeZone.radius
      };
    }

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
      },
      safeZoneStatus
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
 * Get location history
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

    const timeLimit = Math.min(parseInt(hours) || 24, 72);
    const startTime = new Date(Date.now() - timeLimit * 60 * 60 * 1000);
    const maxResults = Math.min(parseInt(limit) || 100, 500);

    const locations = await Location.find({
      userId: targetUserId,
      timestamp: { $gte: startTime }
    })
      .sort({ timestamp: -1 })
      .limit(maxResults)
      .lean();

    const formattedLocations = locations
      .reverse()
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

    const timeLimit = Math.min(parseInt(hours) || 24, 72);
    const startTime = new Date(Date.now() - timeLimit * 60 * 60 * 1000);

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

    let totalDistance = 0;
    for (let i = 0; i < locations.length - 1; i++) {
      const [lng1, lat1] = locations[i].coordinates.coordinates;
      const [lng2, lat2] = locations[i + 1].coordinates.coordinates;

      const distance = calculateDistance(lat1, lng1, lat2, lng2);
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
 * Create or update safe zone
 */
exports.setSafeZone = async (req, res) => {
  try {
    const { role, patientId } = req.session.user;

    if (role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can set safe zones"
      });
    }

    if (!patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You are not linked to a patient"
      });
    }

    const { name, address, latitude, longitude, radius } = req.body;

    if (!address || !latitude || !longitude) {
      return res.status(400).json({
        error: "Validation error",
        message: "Address, latitude, and longitude are required"
      });
    }

    if (!isValidCoordinate(latitude, longitude)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid coordinates"
      });
    }

    const safeZoneData = {
      patientId,
      caregiverId: req.session.user.id,
      name: name || "Home",
      address: address.trim(),
      coordinates: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      radius: radius || 500,
      isActive: true
    };

    // Update or create safe zone
    const safeZone = await SafeZone.findOneAndUpdate(
      { patientId },
      safeZoneData,
      { upsert: true, new: true }
    );

    console.log(`✅ Safe zone set for patient ${patientId}`);

    res.json({
      success: true,
      message: "Safe zone saved successfully",
      safeZone: {
        id: safeZone._id,
        name: safeZone.name,
        address: safeZone.address,
        latitude: safeZone.coordinates.coordinates[1],
        longitude: safeZone.coordinates.coordinates[0],
        radius: safeZone.radius,
        isActive: safeZone.isActive
      }
    });

  } catch (err) {
    console.error("❌ Set safe zone error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to save safe zone"
    });
  }
};

/**
 * Get safe zone
 */
exports.getSafeZone = async (req, res) => {
  try {
    const { role, id, patientId } = req.session.user;

    let targetPatientId;
    if (role === "caregiver") {
      if (!patientId) {
        return res.status(400).json({
          error: "Not linked",
          message: "You are not linked to a patient"
        });
      }
      targetPatientId = patientId;
    } else if (role === "patient") {
      targetPatientId = id;
    } else {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid user role"
      });
    }

    const safeZone = await SafeZone.findOne({ 
      patientId: targetPatientId 
    }).lean();

    if (!safeZone) {
      return res.json({
        success: true,
        safeZone: null,
        message: "No safe zone configured"
      });
    }

    res.json({
      success: true,
      safeZone: {
        id: safeZone._id,
        name: safeZone.name,
        address: safeZone.address,
        latitude: safeZone.coordinates.coordinates[1],
        longitude: safeZone.coordinates.coordinates[0],
        radius: safeZone.radius,
        isActive: safeZone.isActive,
        alertCooldown: safeZone.alertCooldown
      }
    });

  } catch (err) {
    console.error("❌ Get safe zone error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch safe zone"
    });
  }
};

/**
 * Delete safe zone
 */
exports.deleteSafeZone = async (req, res) => {
  try {
    const { role, patientId } = req.session.user;

    if (role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can delete safe zones"
      });
    }

    if (!patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You are not linked to a patient"
      });
    }

    await SafeZone.findOneAndDelete({ patientId });

    console.log(`✅ Safe zone deleted for patient ${patientId}`);

    res.json({
      success: true,
      message: "Safe zone deleted successfully"
    });

  } catch (err) {
    console.error("❌ Delete safe zone error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to delete safe zone"
    });
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

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

function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000;
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