// controllers/medicationController.js
const Medication = require("../models/Medication");

function isValidTime(t) {
  return /^\d{2}:\d{2}$/.test(t);
}

/**
 * Get medications
 * Caregivers see meds for their linked patient
 * Patients see meds for themselves
 */
exports.getMedications = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Please log in"
      });
    }

    const { role, id, patientId } = req.session.user;
    let filter;

    if (role === "caregiver") {
      if (!patientId) {
        return res.json({ success: true, count: 0, medications: [] });
      }
      filter = { patientId };
    } else if (role === "patient") {
      filter = { patientId: id };
    } else {
      return res.status(403).json({
        error: "Forbidden",
        message: "Invalid user role"
      });
    }

    const medications = await Medication.find(filter).sort({ _id: -1 });

    res.json({
      success: true,
      count: medications.length,
      medications
    });

  } catch (err) {
    console.error("Get medications error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to fetch medications"
    });
  }
};

/**
 * Add a new medication
 * Caregiver only
 */
exports.addMedication = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Please log in"
      });
    }

    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can add medications"
      });
    }

    if (!req.session.user.patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You must be linked to a patient first"
      });
    }

    const { name, dosage, time, notes, frequency } = req.body;

    if (!name || name.trim() === "") {
      return res.status(400).json({
        error: "Validation error",
        message: "Medication name is required"
      });
    }

    if (!dosage || dosage.trim() === "") {
      return res.status(400).json({
        error: "Validation error",
        message: "Dosage is required"
      });
    }

    if (!time || time.trim() === "") {
      return res.status(400).json({
        error: "Validation error",
        message: "Time is required"
      });
    }

    if (!isValidTime(time.trim())) {
      return res.status(400).json({
        error: "Validation error",
        message: "Time must be in HH:MM format"
      });
    }

    const freq = Number.isFinite(Number(frequency)) ? Number(frequency) : 1;

    const medication = await Medication.create({
      patientId: req.session.user.patientId,
      name: name.trim(),
      dosage: dosage.trim(),
      frequency: freq,
      times: [time.trim()],
      notes: notes ? notes.trim() : ""
    });

    res.status(201).json({
      success: true,
      medication
    });

  } catch (err) {
    console.error("Add medication error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to add medication"
    });
  }
};

/**
 * Update a medication
 * Caregiver only
 */
exports.updateMedication = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Please log in"
      });
    }

    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can update medications"
      });
    }

    if (!req.session.user.patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You must be linked to a patient first"
      });
    }

    const { id } = req.params;
    const { name, dosage, time, notes, frequency } = req.body;

    const medication = await Medication.findById(id);
    if (!medication) {
      return res.status(404).json({
        error: "Not found",
        message: "Medication not found"
      });
    }

    if (medication.patientId.toString() !== req.session.user.patientId.toString()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only update medications for your linked patient"
      });
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "name")) {
      medication.name = name ? name.trim() : "";
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "dosage")) {
      medication.dosage = dosage ? dosage.trim() : "";
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "time")) {
      if (!time || time.trim() === "") {
        return res.status(400).json({
          error: "Validation error",
          message: "Time is required"
        });
      }
      if (!isValidTime(time.trim())) {
        return res.status(400).json({
          error: "Validation error",
          message: "Time must be in HH:MM format"
        });
      }
      medication.times = [time.trim()];
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "notes")) {
      medication.notes = notes ? notes.trim() : "";
    }

    if (Object.prototype.hasOwnProperty.call(req.body, "frequency")) {
      const freq = Number.isFinite(Number(frequency)) ? Number(frequency) : 1;
      medication.frequency = freq;
    }

    await medication.save();

    res.json({
      success: true,
      medication
    });

  } catch (err) {
    console.error("Update medication error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to update medication"
    });
  }
};

/**
 * Delete a medication
 * Caregiver only
 */
exports.deleteMedication = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "Please log in"
      });
    }

    if (req.session.user.role !== "caregiver") {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only caregivers can delete medications"
      });
    }

    if (!req.session.user.patientId) {
      return res.status(400).json({
        error: "Not linked",
        message: "You must be linked to a patient first"
      });
    }

    const { id } = req.params;
    const medication = await Medication.findById(id);

    if (!medication) {
      return res.status(404).json({
        error: "Not found",
        message: "Medication not found"
      });
    }

    if (medication.patientId.toString() !== req.session.user.patientId.toString()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You can only delete medications for your linked patient"
      });
    }

    await medication.deleteOne();

    res.json({
      success: true,
      message: "Medication deleted successfully"
    });

  } catch (err) {
    console.error("Delete medication error:", err);
    res.status(500).json({
      error: "Server error",
      message: "Failed to delete medication"
    });
  }
};
