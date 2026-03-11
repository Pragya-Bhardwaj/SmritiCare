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
  message: {
    type: String,
    required: true,
    trim: true
  },
  schedule: {
    type: String, // e.g., "09:00", "14:30" in 24-hour format
    required: true
  },
  frequency: {
    type: String,
    enum: ["Daily", "Weekly", "Monthly", "Yearly", "Once"],
    default: "Daily"
  },
  weekDay: {
    type: String,
    enum: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    default: null
  },
  monthDate: {
    type: String,
    default: null
  },
  yearMonth: {
    type: String,
    default: null
  },
  yearDate: {
    type: String,
    default: null
  },
  onceDate: {
    type: String,
    default: null
  },
  category: {
    type: String,
    enum: ["Medicine", "Meal", "Appointment", "Hygiene", "Other"],
    default: "Other"
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  googleCalendarEventIds: {
    caregiver: { type: String, default: null }, // event ID in caregiver's calendar
    patient: { type: String, default: null }    // event ID in patient's calendar
  },
  lastReminderNotificationKey: {
    type: String,
    default: ""
  },
  lastMissedNotificationKey: {
    type: String,
    default: ""
  }
});

// Compound indexes
reminderSchema.index({ patientId: 1, caregiverId: 1 });
reminderSchema.index({ schedule: 1 });
reminderSchema.index({ createdAt: -1 });

module.exports = mongoose.model("Reminder", reminderSchema);
