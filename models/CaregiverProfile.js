const mongoose = require("mongoose");

const caregiverProfileSchema = new mongoose.Schema({
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User",
    required: true 
  },
  relation: {
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

module.exports = mongoose.model("CaregiverProfile", caregiverProfileSchema);