const mongoose = require("mongoose");

const inviteCodeSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  used: { type: Boolean, default: false },  // ✅ Add this
  usedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, default: () => Date.now() + 7*24*60*60*1000 } // 7 days
});

module.exports = mongoose.model("InviteCode", inviteCodeSchema);
