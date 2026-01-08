const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,

  email: {
    type: String,
    unique: true,
    required: true
  },

  password: {
    type: String,
    required: true
  },

  role: {
    type: String,
    enum: ["patient", "caregiver"],
    required: true
  },

  // 🔐 OTP & email verification
  isEmailVerified: {
    type: Boolean,
    default: false
  },

  otp: {
    code: String,
    expiresAt: Date
  },

  // 🔗 Linking state
  linked: {
    type: Boolean,
    default: false
  }, 


  linkedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    default: null
  }
});

module.exports = mongoose.model("User", userSchema);
