// models/CaregiverProfile.js
const mongoose = require("mongoose");

const caregiverProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true,
    unique: true
  },
  phone: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other", ""],
    default: ""
  },
  dateOfBirth: {
    type: Date
  },
  relationToPatient: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    pincode: String
  },
  profileImage: {
    type: String, // URL or base64
    default: ""
  },
  isProfileComplete: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Method to check if profile is complete
caregiverProfileSchema.methods.checkProfileComplete = function() {
  this.isProfileComplete = !!(
    this.phone &&
    this.gender &&
    this.relationToPatient
  );
  return this.isProfileComplete;
};

module.exports = mongoose.model("CaregiverProfile", caregiverProfileSchema);