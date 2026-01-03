const mongoose = require("mongoose");

module.exports = mongoose.model("Memory", new mongoose.Schema({
  caregiverId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  title: String,
  description: String,
  createdAt: { type: Date, default: Date.now }
}));
