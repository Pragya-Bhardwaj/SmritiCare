const mongoose = require("mongoose");

const memorySchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  caregiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  relation: {
    type: String,
    trim: true
  },
  notes: {
    type: String,
    trim: true
  },
  category: {
    type: String,
    trim: true,
    default: "Other"
  },
  imageUrl: {
    type: String
  },
  audioUrl: {
    type: String
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Compound index for efficient queries
memorySchema.index({ patientId: 1, caregiverId: 1 });
memorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Memory", memorySchema);

