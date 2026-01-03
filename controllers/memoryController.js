const Memory = require("../models/Memory");


exports.addMemory = async (req, res) => {
  console.log("SESSION USER:", req.session.user);

  if (!req.session.user.patientId) return res.json({ error: "Not linked" });

  const memory = await Memory.create({
    caregiverId: req.session.user.id,
    patientId: req.session.user.patientId,
    title: req.body.title,
    description: req.body.description
  });

  res.json(memory);
};

exports.getMemories = async (req, res) => {
  const role = req.session.user.role;
  const id = req.session.user.id;

  const memories = role === "caregiver"
    ? await Memory.find({ caregiverId: id })
    : await Memory.find({ patientId: id });

  res.json(memories);
};


