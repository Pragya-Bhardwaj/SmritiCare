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

module.exports = router;