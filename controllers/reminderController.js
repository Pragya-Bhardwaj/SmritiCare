// Calendar sync stub handlers to fix router error
exports.getCalendarAuthUrl = (req, res) => {
  res.status(501).json({ error: "Not implemented", message: "getCalendarAuthUrl not implemented" });
};

exports.handleCalendarCallback = (req, res) => {
  res.status(501).json({ error: "Not implemented", message: "handleCalendarCallback not implemented" });
};

exports.getCalendarStatus = (req, res) => {
  res.status(501).json({ error: "Not implemented", message: "getCalendarStatus not implemented" });
};

exports.disconnectCalendar = (req, res) => {
  // Only caregivers can disconnect their calendar
  if (!req.session.user) {
    return res.status(401).json({ error: "Unauthorized", message: "Please log in" });
  }
  if (req.session.user.role !== "caregiver") {
    return res.status(403).json({ error: "Forbidden", message: "Only caregivers can disconnect calendar" });
  }
  User.findByIdAndUpdate(
    req.session.user.id,
    {
      $set: {
        googleTokens: {
          access_token: null,
          refresh_token: null,
          expiry_date: null,
          token_type: null,
          scope: null
        },
        googleCalendarConnected: false,
        googleTokensExpired: false
      }
    },
    { new: true }
  )
    .then(() => {
      res.json({ success: true, message: "Google Calendar disconnected" });
    })
    .catch((err) => {
      console.error("Disconnect calendar error:", err);
      res.status(500).json({ error: "Server error", message: "Failed to disconnect calendar" });
    });
}
// controllers/reminderController.js
const Reminder = require("../models/Reminder");
const User = require("../models/User");
const {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent
} = require("../utils/googleCalendar");

/* 
   HELPER: Sync a reminder to both calendars
   Returns { caregiver: eventId, patient: eventId }
 */
async function syncToGoogleCalendars(reminder, caregiverUser, patientUser) {
  const eventIds = { caregiver: null, patient: null };

  // Sync to caregiver's Google Calendar
  if (caregiverUser.googleCalendarConnected && caregiverUser.googleTokens?.refresh_token) {
    try {
      eventIds.caregiver = await createCalendarEvent(
        caregiverUser.googleTokens,
        reminder,
        caregiverUser.name,
        patientUser.name
      );
    } catch (e) {
      console.error("Failed to sync reminder to caregiver calendar:", e.message);
    }
  }

  // Sync to patient's Google Calendar (if patient has also connected)
  if (patientUser.googleCalendarConnected && patientUser.googleTokens?.refresh_token) {
    try {
      eventIds.patient = await createCalendarEvent(
        patientUser.googleTokens,
        reminder,
        caregiverUser.name,
        patientUser.name
      );
    } catch (e) {
      console.error("Failed to sync reminder to patient calendar:", e.message);
    }
  }

  return eventIds;
}

/* ─────────────────────────────────────────
   ADD REMINDER
   Only caregivers can add reminders
───────────────────────────────────────── */
exports.addReminder = async (req, res) => {
  try {
    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Please log in" });
    }

    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({ error: "Forbidden", message: "Only caregivers can add reminders" });
    }

    if (!req.session.user.patientId) {
      return res.status(400).json({ error: "Not linked", message: "You must be linked to a patient first" });
    }

    const { message, schedule, frequency, category, weekDay, monthDate, yearMonth, yearDate, onceDate } = req.body;

    if (!message || message.trim() === "") {
      return res.status(400).json({ error: "Validation error", message: "Reminder message is required" });
    }

    if (!schedule || schedule.trim() === "") {
      return res.status(400).json({ error: "Validation error", message: "Schedule (time) is required" });
    }

    if (!/^\d{2}:\d{2}$/.test(schedule.trim())) {
      return res.status(400).json({ error: "Validation error", message: "Schedule must be in HH:MM format" });
    }

    // Create reminder in DB
    const reminder = await Reminder.create({
      caregiverId: req.session.user.id,
      patientId: req.session.user.patientId,
      message: message.trim(),
      schedule: schedule.trim(),
      frequency: frequency || "Daily",
      category: category || "Other",
      isCompleted: false,
      weekDay: weekDay || null,
      monthDate: monthDate || null,
      yearMonth: yearMonth || null,
      yearDate: yearDate || null,
      onceDate: onceDate || null
    });

    // Fetch both users to check Google Calendar connection
    const [caregiverUser, patientUser] = await Promise.all([
      User.findById(req.session.user.id),
      User.findById(req.session.user.patientId)
    ]);

    // Sync to Google Calendar
    const eventIds = await syncToGoogleCalendars(reminder, caregiverUser, patientUser);

    // Save the Google Calendar event IDs back to the reminder
    reminder.googleCalendarEventIds = eventIds;
    await reminder.save();

    // Populate for response
    await reminder.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    // calendarSynced = true if at least one calendar was synced
    const calendarSynced = !!(eventIds.caregiver || eventIds.patient);

    res.status(201).json({ success: true, reminder, calendarSynced });

  } catch (err) {
    console.error("Add reminder error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to add reminder" });
  }
};

/* ─────────────────────────────────────────
   GET REMINDERS
───────────────────────────────────────── */
exports.getReminders = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Please log in" });
    }

    const { role, id, patientId } = req.session.user;
    const { category } = req.query;

    const buildFilter = (base) => {
      const filter = { ...base };
      if (category && category !== 'All') filter.category = category;
      return filter;
    };

    let reminders;

    if (role === "caregiver") {
      if (!patientId) return res.json({ success: true, count: 0, reminders: [] });

      reminders = await Reminder.find(buildFilter({ caregiverId: id, patientId }))
        .populate("patientId", "name")
        .sort({ schedule: 1, createdAt: -1 });

    } else if (role === "patient") {
      reminders = await Reminder.find(buildFilter({ patientId: id }))
        .populate("caregiverId", "name email")
        .sort({ schedule: 1, createdAt: -1 });

    } else {
      return res.status(403).json({ error: "Forbidden", message: "Invalid user role" });
    }

    res.json({ success: true, count: reminders.length, reminders });

  } catch (err) {
    console.error("Get reminders error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to fetch reminders" });
  }
};

/* ─────────────────────────────────────────
   UPDATE REMINDER
───────────────────────────────────────── */
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, schedule, frequency, category, isCompleted, weekDay, monthDate, yearMonth, yearDate, onceDate } = req.body;

    if (!req.session.user) {
      return res.status(401).json({ error: "Unauthorized", message: "Please log in" });
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: "Not found", message: "Reminder not found" });
    }

    if (req.session.user.role === "caregiver") {
      // Caregivers can only edit their own reminders
      if (reminder.caregiverId.toString() !== req.session.user.id) {
        return res.status(403).json({ error: "Forbidden", message: "You can only update your own reminders" });
      }

      if (Object.prototype.hasOwnProperty.call(req.body, 'message'))   reminder.message   = message ? message.trim() : '';
      if (Object.prototype.hasOwnProperty.call(req.body, 'schedule'))  reminder.schedule  = schedule ? schedule.trim() : '';
      if (Object.prototype.hasOwnProperty.call(req.body, 'frequency')) reminder.frequency = frequency || "Daily";
      if (Object.prototype.hasOwnProperty.call(req.body, 'category'))  reminder.category  = category || "Other";
      if (Object.prototype.hasOwnProperty.call(req.body, 'weekDay'))   reminder.weekDay   = weekDay || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'monthDate')) reminder.monthDate = monthDate || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'yearMonth')) reminder.yearMonth = yearMonth || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'yearDate'))  reminder.yearDate  = yearDate || null;
      if (Object.prototype.hasOwnProperty.call(req.body, 'onceDate'))  reminder.onceDate  = onceDate || null;

    } else if (req.session.user.role === "patient") {
      // Patients can only mark as complete/incomplete
      if (Object.prototype.hasOwnProperty.call(req.body, 'isCompleted')) {
        reminder.isCompleted = isCompleted;
        reminder.completedAt = isCompleted ? new Date() : null;
      } else {
        return res.status(403).json({ error: "Forbidden", message: "Patients can only mark reminders as complete" });
      }
    }

    reminder.updatedAt = new Date();
    await reminder.save();

    let calendarSynced = false;

    // Update Google Calendar events only for caregiver edits
    if (req.session.user.role === "caregiver") {
      const [caregiverUser, patientUser] = await Promise.all([
        User.findById(reminder.caregiverId),
        User.findById(reminder.patientId)
      ]);

      // Update in caregiver's calendar
      if (
        caregiverUser.googleCalendarConnected &&
        caregiverUser.googleTokens?.refresh_token &&
        reminder.googleCalendarEventIds?.caregiver
      ) {
        try {
          await updateCalendarEvent(
            caregiverUser.googleTokens,
            reminder.googleCalendarEventIds.caregiver,
            reminder,
            caregiverUser.name,
            patientUser.name
          );
          calendarSynced = true;
        } catch (e) { console.error("Failed to update caregiver calendar event:", e.message); }
      }

      // Update in patient's calendar
      if (
        patientUser.googleCalendarConnected &&
        patientUser.googleTokens?.refresh_token &&
        reminder.googleCalendarEventIds?.patient
      ) {
        try {
          await updateCalendarEvent(
            patientUser.googleTokens,
            reminder.googleCalendarEventIds.patient,
            reminder,
            caregiverUser.name,
            patientUser.name
          );
          calendarSynced = true;
        } catch (e) { console.error("Failed to update patient calendar event:", e.message); }
      }
    }

    await reminder.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    res.json({ success: true, reminder, calendarSynced });

  } catch (err) {
    console.error("Update reminder error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to update reminder" });
  }
};

/* ─────────────────────────────────────────
   DELETE REMINDER
───────────────────────────────────────── */
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ error: "Unauthorized", message: "Only caregivers can delete reminders" });
    }

    const reminder = await Reminder.findById(id);
    if (!reminder) {
      return res.status(404).json({ error: "Not found", message: "Reminder not found" });
    }

    if (reminder.caregiverId.toString() !== req.session.user.id) {
      return res.status(403).json({ error: "Forbidden", message: "You can only delete your own reminders" });
    }

    // Delete from Google Calendars before removing from DB
    const [caregiverUser, patientUser] = await Promise.all([
      User.findById(reminder.caregiverId),
      User.findById(reminder.patientId)
    ]);

    if (
      caregiverUser.googleCalendarConnected &&
      caregiverUser.googleTokens?.refresh_token &&
      reminder.googleCalendarEventIds?.caregiver
    ) {
      try {
        await deleteCalendarEvent(
          caregiverUser.googleTokens,
          reminder.googleCalendarEventIds.caregiver
        );
      } catch (e) { console.error("Failed to delete caregiver calendar event:", e.message); }
    }

    if (
      patientUser.googleCalendarConnected &&
      patientUser.googleTokens?.refresh_token &&
      reminder.googleCalendarEventIds?.patient
    ) {
      try {
        await deleteCalendarEvent(
          patientUser.googleTokens,
          reminder.googleCalendarEventIds.patient
        );
      } catch (e) { console.error("Failed to delete patient calendar event:", e.message); }
    }

    await reminder.deleteOne();

    res.json({ success: true, message: "Reminder deleted successfully" });

  } catch (err) {
    console.error("Delete reminder error:", err);
    res.status(500).json({ error: "Server error", message: "Failed to delete reminder" });
  }
};