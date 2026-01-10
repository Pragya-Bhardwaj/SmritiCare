const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  title: String,
  description: String
});

module.exports = mongoose.model("Memory", memorySchema);
