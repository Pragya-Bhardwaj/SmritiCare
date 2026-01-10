const mongoose = require("mongoose");

const selfCareSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  tip: String
});

module.exports = mongoose.model("SelfCare", selfCareSchema);
