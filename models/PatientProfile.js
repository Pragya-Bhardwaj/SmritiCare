const mongoose = require("mongoose");

module.exports = mongoose.model("PatientProfile", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  age: Number,
  condition: String
}));

