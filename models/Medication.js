// models/Medication.js
const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  dosage: {
    type: String,
    required: true,
    trim: true // e.g., "500mg", "1 tablet"
  },
  frequency: {
    type: Number, // times per day
    required: true,
    default: 1
  },
  startDate: {
    type: Date,
    required: true,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: null
  },
  times: [{
    type: String // e.g., ["09:00", "21:00"]
  }],
  notes: {
    type: String,
    trim: true
  },
});

medicationSchema.index({ patientId: 1 });

module.exports = mongoose.model("Medication", medicationSchema);