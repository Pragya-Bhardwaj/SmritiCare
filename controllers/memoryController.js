const Memory = require("../models/Memory");
const CarePair = require("../models/CarePair");

// Caregiver adds memory
exports.addMemory = async (req, res) => {
  try {
    const caregiverId = req.session.user.id;

    const pair = await CarePair.findOne({ caregiverId });
    if (!pair) return res.status(400).send("No patient linked");

    await Memory.create({
      patientId: pair.patientId,
      title: req.body.title,
      description: req.body.description,
    });

    res.redirect("/caregiver/memory");
  } catch (error) {
    console.error(error);
    res.status(500).send("Unable to add memory");
  }
};

// View memory board (caregiver & patient)
exports.viewMemories = async (req, res) => {
  try {
    let patientId;

    if (req.session.user.role === "caregiver") {
      const pair = await CarePair.findOne({
        caregiverId: req.session.user.id,
      });
      patientId = pair.patientId;
    } else {
      patientId = req.session.user.id;
    }

    const memories = await Memory.find({ patientId });

    res.render("memory", { memories });
  } catch (error) {
    console.error(error);
    res.status(500).send("Unable to fetch memories");
  }
};
