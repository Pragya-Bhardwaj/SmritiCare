const mongoose = require("mongoose");

const patientProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  age: {
    type: Number,
    min: 0,
    max: 150
  },
  condition: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  gender: {
    type: String,
    enum: ["Male", "Female", "Other", "Prefer not to say", null],
    default: null
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("PatientProfile", patientProfileSchema);