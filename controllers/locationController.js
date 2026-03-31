/// controllers/locationController.js
const Location = require("../models/Location");
const SafeZone = require("../models/SafeZone");
const User = require("../models/User");
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");

/* MAIL SETUP */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const EMAIL_LOGO_CID = "smriticare-logo";

function getEmailLogoAttachment() {
  const imageDir = path.join(__dirname, "../public/images");
  const candidates = [
    "email-logo.png",
    "email-logo.jpg",
    "email-logo.jpeg",
    "email-logo.webp",
    "email-logo.svg",
    "smriticare-logo.png",
    "smriticare-logo.jpg",
    "smriticare-logo.jpeg",
    "smriticare-logo.webp",
    "smriticare-logo.svg"
  ];

  for (const name of candidates) {
    const fullPath = path.join(imageDir, name);
    if (fs.existsSync(fullPath)) {
      return {
        filename: name,
        path: fullPath,
        cid: EMAIL_LOGO_CID
      };
    }
  }

  return null;
}

/**
 * Send safe zone alert email using the current SmritiCare email theme.
 */
async function sendSafeZoneAlert(caregiver, patient, distance, safeZone) {
  try {
    const alertTime = new Date().toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
    const roundedDistance = Math.round(distance);
    const siteUrl = process.env.APP_URL || process.env.APP_BASE_URL || "http://localhost:3000";
    const dashboardUrl = `${siteUrl}/caregiver/location`;
    const logoAttachment = getEmailLogoAttachment();
    const logoSrc = logoAttachment ? `cid:${EMAIL_LOGO_CID}` : null;
    const brandVisualMarkup = logoSrc
      ? `<div style="width: 56px; height: 56px; border-radius: 18px; overflow: hidden; background-color: rgba(255, 255, 255, 0.92); padding: 10px; box-sizing: border-box; box-shadow: 0 12px 28px rgba(57, 72, 118, 0.14);">
           <img src="${logoSrc}" alt="SmritiCare logo" style="display: block; width: 100%; height: 100%; object-fit: contain;" />
         </div>`
      : `<div style="width: 56px; height: 56px; border-radius: 18px; background-color: rgba(255, 255, 255, 0.88); color: #171b33; font-size: 20px; font-weight: 800; text-align: center; line-height: 56px; box-shadow: 0 12px 28px rgba(57, 72, 118, 0.14);">
           SC
         </div>`;
    const subject = `Safe Zone Alert: ${patient.name} has left the safe zone`;
    const text = [
      "SmritiCare Safe Zone Alert",
      "",
      `${patient.name} is ${roundedDistance} meters outside ${safeZone.name}.`,
      `Time: ${alertTime}`,
      `Address: ${safeZone.address}`,
      "",
      "Recommended actions:",
      `- Check the live location dashboard: ${dashboardUrl}`,
      `- Contact ${patient.name} to confirm they are safe`,
      "- Monitor their location over the next few minutes"
    ].join("\n");

    await transporter.sendMail({
      from: `"SmritiCare Alert" <${process.env.EMAIL_USER}>`,
      to: caregiver.email,
      subject,
      text,
      html: `
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>Safe Zone Alert</title>
          </head>
          <body style="margin: 0; padding: 0; background-color: #dbe3fb; font-family: 'Segoe UI', Arial, sans-serif;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #dbe3fb; padding: 28px 14px;">
              <tr>
                <td align="center">
                  <table role="presentation" style="width: 100%; max-width: 680px; border-collapse: collapse; background: linear-gradient(135deg, #fcfdff 0%, #eef3ff 56%, #fff8ea 100%); border: 1px solid #e5ebf7; border-radius: 32px; overflow: hidden; box-shadow: 0 26px 70px rgba(63, 78, 122, 0.18);">
                    <tr>
                      <td style="padding: 28px 32px 18px;">
                        <table role="presentation" style="width: 100%; border-collapse: collapse;">
                          <tr>
                            <td style="width: 72px; vertical-align: middle;">
                              ${brandVisualMarkup}
                            </td>
                            <td style="vertical-align: middle;">
                              <p style="margin: 0; color: #1d2340; font-size: 23px; font-weight: 800; letter-spacing: -0.03em;">SmritiCare Hub</p>
                              <p style="margin: 5px 0 0; font-size: 14px; color: #7280a0;">Bring every care detail into one calm flow</p>
                            </td>
                            <td style="width: 118px; vertical-align: middle;" align="right">
                              <span style="display: inline-block; background: #171b33; color: #ffffff; border: 1px solid #171b33; border-radius: 999px; padding: 10px 16px; font-size: 11px; font-weight: 800; letter-spacing: 0.12em;">
                                LIVE ALERT
                              </span>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 32px 18px;">
                        <div style="background: rgba(255, 255, 255, 0.72); border: 1px solid #e5ebf7; border-radius: 30px; padding: 28px;">
                          <p style="margin: 0 0 16px; color: #6d7ca1; font-size: 12px; font-weight: 800; letter-spacing: 0.18em; text-transform: uppercase;">Safe zone monitoring</p>
                          <h1 style="margin: 0; color: #1d2340; font-size: 34px; line-height: 1.06; letter-spacing: -0.06em;">${patient.name} moved outside the safe zone.</h1>
                          <p style="margin: 14px 0 0; color: #66738f; font-size: 16px; line-height: 1.65;">
                            ${patient.name} is currently ${roundedDistance} meters beyond <strong style="color: #1d2340;">${safeZone.name}</strong>. Review the live map and check in if needed.
                          </p>
                          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 22px; background: linear-gradient(180deg, #ffffff 0%, #eff4ff 100%); border: 1px solid #d6e1fb; border-radius: 24px;">
                            <tr>
                              <td style="padding: 16px 18px; border-bottom: 1px solid #d6e1fb; color: #56627f; font-size: 14px;">
                                <strong style="color: #1d2340;">Patient</strong><br />
                                ${patient.name}
                              </td>
                              <td style="padding: 16px 18px; border-bottom: 1px solid #d6e1fb; color: #56627f; font-size: 14px;">
                                <strong style="color: #1d2340;">Distance</strong><br />
                                ${roundedDistance}m outside safe zone
                              </td>
                            </tr>
                            <tr>
                              <td style="padding: 16px 18px; border-bottom: 1px solid #d6e1fb; color: #56627f; font-size: 14px;">
                                <strong style="color: #1d2340;">Time</strong><br />
                                ${alertTime}
                              </td>
                              <td style="padding: 16px 18px; border-bottom: 1px solid #d6e1fb; color: #56627f; font-size: 14px;">
                                <strong style="color: #1d2340;">Safe zone</strong><br />
                                ${safeZone.name}
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="padding: 16px 18px; color: #56627f; font-size: 14px; line-height: 1.65;">
                                <strong style="color: #1d2340;">Address</strong><br />
                                ${safeZone.address}
                              </td>
                            </tr>
                          </table>
                          <div style="margin-top: 18px; background-color: #f3f7ff; border-left: 4px solid #88c7ff; border-radius: 16px; padding: 14px 16px;">
                            <p style="margin: 0; color: #56627f; font-size: 14px; line-height: 1.6;">
                              Review the dashboard, contact ${patient.name} if possible, and keep an eye on their location for the next few minutes.
                            </p>
                          </div>
                          <table role="presentation" style="width: 100%; border-collapse: collapse; margin-top: 18px;">
                            <tr>
                              <td style="padding: 0;">
                                <a href="${dashboardUrl}" style="display: inline-block; background-color: #171b33; color: #ffffff; border: 1px solid #171b33; text-decoration: none; font-weight: 800; font-size: 14px; padding: 14px 24px; border-radius: 999px; box-shadow: 0 16px 28px rgba(23, 27, 51, 0.18);">
                                  View Live Location
                                </a>
                              </td>
                            </tr>
                          </table>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td style="padding: 0 32px 32px;">
                        <p style="margin: 0; color: #7f8ba5; font-size: 12px; line-height: 1.6;">
                          This automated alert was sent because you are registered as the caregiver for ${patient.name}.
                        </p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </body>
        </html>
      `,
      attachments: logoAttachment ? [logoAttachment] : undefined
    });

    console.log(`Safe zone alert sent to ${caregiver.email}`);
  } catch (err) {
    console.error("Failed to send safe zone alert:", err);
    throw new Error("Failed to send alert email");
  }
}

/**
 * Legacy safe zone alert email kept for reference while the new theme rolls out.
 */
async function sendSafeZoneAlertLegacy(caregiver, patient, distance, safeZone) {
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
          <div style="background: linear-gradient(135deg, #d86b86 0%, #f3b0a8 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 28px;">🚨 Safe Zone Alert</h1>
            <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Patient has left their safe zone</p>
          </div>

          <!-- Main Content -->
          <div style="padding: 30px; background: #fff6fa; border: 1px solid #eadfd4;">
            
            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #d86b86;">
              <h2 style="margin: 0 0 15px 0; color: #3d3a37; font-size: 20px;">⚠️ Alert Details</h2>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #8c857d; font-size: 14px;">Patient:</td>
                  <td style="padding: 8px 0; color: #3d3a37; font-weight: 600; font-size: 14px;">${patient.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #8c857d; font-size: 14px;">Time:</td>
                  <td style="padding: 8px 0; color: #3d3a37; font-weight: 600; font-size: 14px;">${alertTime}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #8c857d; font-size: 14px;">Safe Zone:</td>
                  <td style="padding: 8px 0; color: #3d3a37; font-weight: 600; font-size: 14px;">${safeZone.name}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #8c857d; font-size: 14px;">Address:</td>
                  <td style="padding: 8px 0; color: #3d3a37; font-weight: 600; font-size: 14px;">${safeZone.address}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #8c857d; font-size: 14px;">Distance:</td>
                  <td style="padding: 8px 0; color: #d86b86; font-weight: 700; font-size: 16px;">${Math.round(distance)}m outside safe zone</td>
                </tr>
              </table>
            </div>

            <div style="background: #fbeaec; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #f3b0a8;">
              <p style="margin: 0; color: #5b5754; font-size: 14px; line-height: 1.6;">
                <strong>📍 What This Means:</strong><br>
                ${patient.name} is currently ${Math.round(distance)} meters away from their designated safe zone (${safeZone.name}). 
                This could indicate they have wandered away or left their usual area.
              </p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h3 style="margin: 0 0 12px 0; color: #3d3a37; font-size: 16px;">✅ Recommended Actions:</h3>
              <ul style="margin: 0; padding-left: 20px; color: #5b5754; line-height: 1.8; font-size: 14px;">
                <li>Check their current location on the SmritiCare dashboard</li>
                <li>Try calling ${patient.name} to confirm they're safe</li>
                <li>If you can't reach them, consider checking common locations</li>
                <li>Monitor their location for the next 15-30 minutes</li>
              </ul>
            </div>

            <!-- Action Button -->
            <div style="text-align: center; margin: 25px 0;">
              <a href="${process.env.APP_URL || 'http://localhost:3000'}/caregiver/location" 
                 style="display: inline-block; background: linear-gradient(135deg, #d86b86 0%, #f3b0a8 100%); 
                        color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; 
                        font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(216, 107, 134, 0.35);">
                📍 View Live Location
              </a>
            </div>

          </div>

          <!-- Footer -->
          <div style="background: #f4cdd6; color: #5b5754; padding: 20px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px;">
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

    const parsedLat = parseFloat(latitude);
    const parsedLng = parseFloat(longitude);
    const parsedRadius = parseInt(radius) || 500;

    // Check the patient's current location against the new zone
    const currentLocation = await Location.findOne({ userId: patientId })
      .sort({ timestamp: -1 })
      .lean();

    let patientIsOutside = false;
    let distanceOutside = 0;

    if (currentLocation) {
      const [locLng, locLat] = currentLocation.coordinates.coordinates;
      const distanceFromCenter = calculateDistance(parsedLat, parsedLng, locLat, locLng);
      patientIsOutside = distanceFromCenter > parsedRadius;
      if (patientIsOutside) {
        distanceOutside = distanceFromCenter - parsedRadius;
      }
    }

    const safeZoneData = {
      patientId,
      caregiverId: req.session.user.id,
      name: name || "Home",
      address: address.trim(),
      coordinates: {
        type: 'Point',
        coordinates: [parsedLng, parsedLat]
      },
      radius: parsedRadius,
      isActive: true,
      // Clear lastAlertSent so future alerts work normally.
      // If patient is already outside we'll send an alert now and stamp it below.
      lastAlertSent: null
    };

    // Update or create safe zone
    const safeZone = await SafeZone.findOneAndUpdate(
      { patientId },
      safeZoneData,
      { upsert: true, new: true }
    );

    // If patient is already outside the new zone, send an alert immediately
    if (patientIsOutside) {
      try {
        const caregiver = await User.findById(req.session.user.id);
        const patient   = await User.findById(patientId);
        if (caregiver && patient && caregiver.email) {
          await sendSafeZoneAlert(caregiver, patient, distanceOutside, safeZone);
          safeZone.lastAlertSent = new Date();
          await safeZone.save();
          console.log(`📧 Immediate safe zone alert sent — patient was already outside when zone was set`);
        }
      } catch (alertErr) {
        console.error("❌ Failed to send immediate safe zone alert:", alertErr);
      }
    }

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
