const mongoose = require("mongoose");

const patientSelfCareSchema = new mongoose.Schema(
  {
    patientEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    title: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    category: {
      type: String,
      default: "General"
    },
    createdBy: {
      type: String, // caregiver email
      required: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientSelfCare", patientSelfCareSchema);
