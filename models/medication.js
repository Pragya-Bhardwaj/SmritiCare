const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  name: String,
  dose: String,
  time: String,
  notes: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Medication", medicationSchema);
