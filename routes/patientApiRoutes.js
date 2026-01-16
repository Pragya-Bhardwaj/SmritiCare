const express = require("express");
const router = express.Router();

const Memory = require("../models/Memory");
const SelfCare = require("../models/selfcare");

function requirePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}





/* MEMORY */
router.get("/memories", requirePatient, async (req, res) => {
  res.json(await Memory.find({ patientId: req.session.user.id }));
});

router.post("/memories", requirePatient, async (req, res) => {
  // Patients are not allowed to create memories; only caregivers can add memories for their linked patient
  res.status(403).json({ error: 'Forbidden', message: 'Patients cannot create memories' });
});

module.exports = router;
