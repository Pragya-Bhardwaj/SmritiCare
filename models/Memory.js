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
  imageUrl: {
    type: String
  },
  imagePublicId: {
    type: String
  },
  audioUrl: {
    type: String
  },
  audioPublicId: {
    type: String
  },
  videoUrl: {
    type: String
  },
  videoPublicId: {
    type: String
  },
  tags: [{
    type: String
  }]
}, {
  timestamps: true
});

memorySchema.index({ patientId: 1, caregiverId: 1 });
memorySchema.index({ createdAt: -1 });

module.exports = mongoose.model("Memory", memorySchema);

