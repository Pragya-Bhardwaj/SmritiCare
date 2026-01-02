const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
      required: true,
    },

    createdBy: {
      type: String,
      enum: ["caregiver"],
      default: "caregiver",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Memory", memorySchema);
