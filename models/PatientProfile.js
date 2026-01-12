// models/PatientProfile.js
const mongoose = require("mongoose");

const patientProfileSchema = new mongoose.Schema({
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
  bloodGroup: {
    type: String,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", ""],
    default: ""
  },
  medicalCondition: {
    type: String,
    trim: true
  },
  emergencyContact: {
    name: String,
    phone: String,
    relation: String
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
patientProfileSchema.methods.checkProfileComplete = function() {
  this.isProfileComplete = !!(
    this.phone &&
    this.gender &&
    this.dateOfBirth
  );
  return this.isProfileComplete;
};

module.exports = mongoose.model("PatientProfile", patientProfileSchema);