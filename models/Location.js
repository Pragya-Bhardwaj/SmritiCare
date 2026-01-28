// models/Location.js
const mongoose = require("mongoose");

const locationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
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
  address: {
    type: String,
    default: ""
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  accuracy: {
    type: Number, // accuracy in meters
    default: null
  }
}, {
  timestamps: true
});

// Create geospatial index for location queries
locationSchema.index({ coordinates: '2dsphere' });

// Automatically delete old location records (keep last 24 hours)
locationSchema.index({ timestamp: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model("Location", locationSchema);