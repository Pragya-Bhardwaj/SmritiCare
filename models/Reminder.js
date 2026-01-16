// models/Reminder.js
const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  medicationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Medication",
    default: null
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    type: String, // e.g., "09:00", "14:30"
    required: true
  },
  frequency: {
    type: String,
    enum: ["Daily", "Weekly", "Monthly", "Once"],
    default: "Daily"
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  }
});

// Compound indexes
reminderSchema.index({ patientId: 1, caregiverId: 1 });
reminderSchema.index({ schedule: 1 });

module.exports = mongoose.model("Reminder", reminderSchema);