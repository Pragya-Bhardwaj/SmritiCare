// models/SelfCareTip.js
const mongoose = require("mongoose");

const selfCareTipSchema = new mongoose.Schema({
  tipTitle: {
    type: String,
    required: true,
    trim: true
  },
  tipDescription: {
    type: String,
    required: true,
    trim: true
  },
  
});

selfCareTipSchema.index({ category: 1 });
selfCareTipSchema.index({ targetRole: 1 });

module.exports = mongoose.model("SelfCareTip", selfCareTipSchema);