const mongoose = require("mongoose");

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  linked: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("InviteCode", inviteCodeSchema);
