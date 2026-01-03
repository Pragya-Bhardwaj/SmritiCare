const express = require("express");
const router = express.Router();
const InviteCode = require("../models/InviteCode");

/* SEND PATIENT CODE */
router.get("/invite", async (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.status(403).json({});
  }

  const invite = await InviteCode.findOne({
    patientId: req.session.user.id,
    used: false
  });

  res.json({ code: invite.code });
});

/* LINK CAREGIVER */
router.post("/link", async (req, res) => {
  const invite = await InviteCode.findOne({
    code: req.body.code,
    used: false
  });

  if (!invite) return res.json({ success: false });

  invite.used = true;
  await invite.save();

  res.json({ success: true });
});

module.exports = router;
