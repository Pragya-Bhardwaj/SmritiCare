const express = require("express");
const router = express.Router();

const Memory = require("../models/Memory");
const SelfCare = require("../models/SelfCare");

function requirePatient(req, res, next) {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}





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
