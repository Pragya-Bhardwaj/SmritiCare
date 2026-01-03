const InviteCode = require("../models/InviteCode");

/*
  Caregiver enters patient invite code
  Backend verifies and links
*/
exports.linkPatient = async (req, res) => {
  try {
    const { code } = req.body;

    const invite = await InviteCode.findOne({ code, used: false });
    if (!invite) {
      return res.status(400).json({ success: false, message: "Invalid code" });
    }

    req.session.user.patientId = invite.patientId;
    req.session.user.linked = true;

    invite.used = true;
    await invite.save();

    res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
};
