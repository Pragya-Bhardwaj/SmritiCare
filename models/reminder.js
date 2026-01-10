const mongoose = require("mongoose");

const reminderSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  text: String,
  time: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Reminder", reminderSchema);
