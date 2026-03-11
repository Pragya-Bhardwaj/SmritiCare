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
    },

    /* GOOGLE CALENDAR INTEGRATION - CORRECTED */
    googleTokens: {
      access_token: {
        type: String,
        default: null
      },
      refresh_token: {
        type: String,
        default: null
      },
      expiry_date: {
        type: Date,  // Changed from Number to Date for easier comparison
        default: null
      },
      token_type: {
        type: String,
        default: null
      },
      scope: {
        type: String,
        default: null
      }
    },

    googleCalendarConnected: {
      type: Boolean,
      default: false
    },

    /* Flag to track if user needs to re-authorize */
    googleTokensExpired: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

/* INDEXES */
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ linked: 1 });
userSchema.index({ googleCalendarConnected: 1 });

/* VIRTUAL: Get linked patient for caregiver or linked caregiver for patient */
userSchema.virtual("linkedProfile").get(function() {
  return this.linkedUser;
});

/* METHODS */

/**
 * Check if Google tokens are expired
 */
userSchema.methods.isGoogleTokenExpired = function() {
  if (!this.googleTokens || !this.googleTokens.expiry_date) {
    return true;
  }
  
  const now = new Date();
  const bufferMs = 5 * 60 * 1000; // 5 minute buffer
  const expiryTime = new Date(this.googleTokens.expiry_date).getTime();
  
  return now.getTime() > (expiryTime - bufferMs);
};

/**
 * Check if user has valid Google tokens
 */
userSchema.methods.hasValidGoogleTokens = function() {
  return (
    this.googleTokens &&
    this.googleTokens.access_token &&
    this.googleTokens.refresh_token &&
    !this.isGoogleTokenExpired()
  );
};

/**
 * Clear Google Calendar connection
 */
userSchema.methods.disconnectGoogleCalendar = function() {
  this.googleTokens = {
    access_token: null,
    refresh_token: null,
    expiry_date: null,
    token_type: null,
    scope: null
  };
  this.googleCalendarConnected = false;
  this.googleTokensExpired = false;
};

module.exports = mongoose.model("User", userSchema);