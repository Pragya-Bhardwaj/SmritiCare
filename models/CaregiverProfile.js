const mongoose = require("mongoose");

module.exports = mongoose.model("CaregiverProfile", new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  relation: String,
  phone: String
}));
