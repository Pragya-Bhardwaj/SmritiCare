// models/SafeZone.js
const mongoose = require("mongoose");

const safeZoneSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true, // One safe zone per patient
    index: true
  },
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: "Home"
  },
  address: {
    type: String,
    required: true,
    trim: true
  },
  coordinates: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radius: {
    type: Number, // radius in meters
    default: 500,
    min: 50,
    max: 5000
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastAlertSent: {
    type: Date,
    default: null
  },
  alertCooldown: {
    type: Number, // minutes before sending next alert
    default: 30
  }
}, {
  timestamps: true
});

// Create geospatial index for safe zone queries
safeZoneSchema.index({ coordinates: '2dsphere' });

// Method to check if a location is inside the safe zone
safeZoneSchema.methods.isInsideSafeZone = function(latitude, longitude) {
  const [zoneLng, zoneLat] = this.coordinates.coordinates;
  const distance = calculateDistance(zoneLat, zoneLng, latitude, longitude);
  return distance <= this.radius;
};

// Method to check if alert cooldown has passed
safeZoneSchema.methods.canSendAlert = function() {
  if (!this.lastAlertSent) return true;
  
  const now = new Date();
  const cooldownMs = this.alertCooldown * 60 * 1000;
  const timeSinceLastAlert = now - this.lastAlertSent;
  
  return timeSinceLastAlert >= cooldownMs;
};

// Helper function: Calculate distance using Haversine formula
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

module.exports = mongoose.model("SafeZone", safeZoneSchema);