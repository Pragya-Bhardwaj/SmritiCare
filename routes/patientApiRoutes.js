const express = require("express");
const router = express.Router();

const Medication = require("../models/Medication");
const Reminder = require("../models/Reminder");
const Memory = require("../models/Memory");
const SelfCare = require("../models/SelfCare");

function requirePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* ===== MEDICATION ===== */
router.get("/medications", requirePatient, async (req, res) => {
  res.json(await Medication.find({ patientId: req.session.user.id }));
});

router.post("/medications", requirePatient, async (req, res) => {
  res.json(
    await Medication.create({
      patientId: req.session.user.id,
      ...req.body
    })
  );
});

router.delete("/medications/:id", requirePatient, async (req, res) => {
  await Medication.findByIdAndDelete(req.params.id);
  res.json({ success: true });
});

/* ===== REMINDERS ===== */
router.get("/reminders", requirePatient, async (req, res) => {
  res.json(await Reminder.find({ patientId: req.session.user.id }));
});

router.post("/reminders", requirePatient, async (req, res) => {
  res.json(
    await Reminder.create({
      patientId: req.session.user.id,
      ...req.body
    })
  );
});

/* ===== MEMORY ===== */
router.get("/memories", requirePatient, async (req, res) => {
  res.json(await Memory.find({ patientId: req.session.user.id }));
});

router.post("/memories", requirePatient, async (req, res) => {
  res.json(
    await Memory.create({
      patientId: req.session.user.id,
      ...req.body
    })
  );
});

module.exports = router;
