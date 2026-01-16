const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema(
  {
    code: {
      type: String
    },
    expiresAt: {
      type: Date
    }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
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

    /* EMAIL VERIFICATION */
    isEmailVerified: {
      type: Boolean,
      default: false
    },

    otp: otpSchema,

    /* LINKING */
    linked: {
      type: Boolean,
      default: false
    },

    linkedUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model("User", userSchema);

