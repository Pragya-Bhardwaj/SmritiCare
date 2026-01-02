const mongoose = require("mongoose");

const caregiverProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    phone: {
      type: String,
    },

    relationToPatient: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("CaregiverProfile", caregiverProfileSchema);
