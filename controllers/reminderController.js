// controllers/reminderController.js
const Reminder = require("../models/Reminder");

/**
 * Add a new reminder
 * Only caregivers can add reminders for their linked patient
 */
exports.addReminder = async (req, res) => {
  try {
    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    // Only caregivers can add reminders
    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Only caregivers can add reminders" 
      });
    }

    // Check if caregiver is linked to a patient
    if (!req.session.user.patientId) {
      return res.status(400).json({ 
        error: "Not linked",
        message: "You must be linked to a patient first" 
      });
    }

    const { message, schedule, frequency, category } = req.body;

    // Validate required fields
    if (!message || message.trim() === "") {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Reminder message is required" 
      });
    }

    if (!schedule || schedule.trim() === "") {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Schedule (time) is required" 
      });
    }

    // Validate schedule format (HH:MM)
    if (!/^\d{2}:\d{2}$/.test(schedule.trim())) {
      return res.status(400).json({ 
        error: "Validation error",
        message: "Schedule must be in HH:MM format" 
      });
    }

    // Create reminder
    const reminder = await Reminder.create({
      caregiverId: req.session.user.id,
      patientId: req.session.user.patientId,
      message: message.trim(),
      schedule: schedule.trim(),
      frequency: frequency || "Daily",
      category: category || "Other",
      isCompleted: false
    });

    // Populate references for response
    await reminder.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    res.status(201).json({
      success: true,
      reminder
    });

  } catch (err) {
    console.error("Add reminder error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to add reminder" 
    });
  }
};

/**
 * Get reminders
 * Caregivers see reminders they created for their patient
 * Patients see all reminders created for them
 */
exports.getReminders = async (req, res) => {
  try {
    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    const { role, id, patientId } = req.session.user;
    const { category } = req.query;
    let reminders;

    const buildFilter = (base) => {
      const filter = { ...base };
      if (category && category !== 'All') {
        filter.category = category;
      }
      return filter;
    };

    if (role === "caregiver") {
      // Caregiver sees reminders they created for their patient
      if (!patientId) {
        return res.json({ reminders: [] }); // Not linked yet
      }
      const filter = buildFilter({ caregiverId: id, patientId });
      reminders = await Reminder.find(filter)
        .populate("patientId", "name")
        .sort({ schedule: 1, createdAt: -1 });

    } else if (role === "patient") {
      // Patient sees all reminders created for them
      const filter = buildFilter({ patientId: id });
      reminders = await Reminder.find(filter)
        .populate("caregiverId", "name email")
        .sort({ schedule: 1, createdAt: -1 });

    } else {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "Invalid user role" 
      });
    }

    res.json({
      success: true,
      count: reminders.length,
      reminders
    });

  } catch (err) {
    console.error("Get reminders error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to fetch reminders" 
    });
  }
};

/**
 * Update a reminder
 */
exports.updateReminder = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, schedule, frequency, category, isCompleted } = req.body;

    // Validate session
    if (!req.session.user) {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Please log in" 
      });
    }

    // Find reminder
    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({ 
        error: "Not found",
        message: "Reminder not found" 
      });
    }

    // Caregivers can only update their own reminders
    if (req.session.user.role === "caregiver") {
      if (reminder.caregiverId.toString() !== req.session.user.id) {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "You can only update your own reminders" 
        });
      }
    } else if (req.session.user.role === "patient") {
      // Patients can only mark reminders as complete/incomplete
      if (Object.prototype.hasOwnProperty.call(req.body, 'isCompleted')) {
        reminder.isCompleted = isCompleted;
        if (isCompleted) {
          reminder.completedAt = new Date();
        } else {
          reminder.completedAt = null;
        }
      } else {
        return res.status(403).json({ 
          error: "Forbidden",
          message: "Patients can only mark reminders as complete" 
        });
      }
    }

    // Update fields (caregiver only)
    if (req.session.user.role === "caregiver") {
      if (Object.prototype.hasOwnProperty.call(req.body, 'message')) {
        reminder.message = message ? message.trim() : '';
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'schedule')) {
        reminder.schedule = schedule ? schedule.trim() : '';
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'frequency')) {
        reminder.frequency = frequency || "Daily";
      }
      if (Object.prototype.hasOwnProperty.call(req.body, 'category')) {
        reminder.category = category || "Other";
      }
    }

    reminder.updatedAt = new Date();
    await reminder.save();

    // Populate references to return a consistent object
    await reminder.populate([
      { path: "caregiverId", select: "name email" },
      { path: "patientId", select: "name" }
    ]);

    res.json({
      success: true,
      reminder
    });

  } catch (err) {
    console.error("Update reminder error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to update reminder" 
    });
  }
};

/**
 * Delete a reminder
 */
exports.deleteReminder = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate session
    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.status(401).json({ 
        error: "Unauthorized",
        message: "Only caregivers can delete reminders" 
      });
    }

    // Find reminder and verify ownership
    const reminder = await Reminder.findById(id);

    if (!reminder) {
      return res.status(404).json({ 
        error: "Not found",
        message: "Reminder not found" 
      });
    }

    if (reminder.caregiverId.toString() !== req.session.user.id) {
      return res.status(403).json({ 
        error: "Forbidden",
        message: "You can only delete your own reminders" 
      });
    }

    await reminder.deleteOne();

    res.json({
      success: true,
      message: "Reminder deleted successfully"
    });

  } catch (err) {
    console.error("Delete reminder error:", err);
    res.status(500).json({ 
      error: "Server error",
      message: "Failed to delete reminder" 
    });
  }
};