// routes/reminderRoutes.js
const express = require("express");
const router = express.Router();
const reminderController = require("../controllers/reminderController");

/**
 * REMINDER API ROUTES
 * Accessible to both caregivers and patients
 */

// Get reminders (caregiver sees their reminders, patient sees all reminders for them)
router.get("/api/reminders", reminderController.getReminders);

// Add reminder (caregiver only)
router.post("/api/reminders", reminderController.addReminder);

// Update reminder (caregiver can edit, patient can mark complete)
router.put("/api/reminders/:id", reminderController.updateReminder);

// Delete reminder (caregiver only)
router.delete("/api/reminders/:id", reminderController.deleteReminder);

/**
 * CALENDAR SYNC ROUTES
 * Handle Google Calendar authorization and status
 */

// Get Google Calendar authorization URL
router.get("/api/reminders/calendar/auth-url", reminderController.getCalendarAuthUrl);

// Handle Google OAuth callback
router.get("/api/reminders/calendar/callback", reminderController.handleCalendarCallback);

// Check calendar connection status
router.get("/api/reminders/calendar/status", reminderController.getCalendarStatus);

// Disconnect Google Calendar
router.post("/api/reminders/calendar/disconnect", reminderController.disconnectCalendar);

module.exports = router;