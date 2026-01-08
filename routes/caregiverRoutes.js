const express = require("express");
const router = express.Router();
const path = require("path");
const InviteCode = require("../models/InviteCode");
const User = require("../models/User");

/* ================= LINK PAGE ================= */
router.get("/link", (req, res) => {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/link.html")
  );
});

/* ================= LINK ACTION ================= */
router.post("/link", async (req, res) => {
  try {
    if (!req.session.user || req.session.user.role !== "caregiver") {
      return res.json({ success: false, error: "Unauthorized" });
    }

    const { code } = req.body;

    const invite = await InviteCode.findOne({ code });
    if (!invite || invite.linked) {
      return res.json({ success: false, error: "Invalid invite code" });
    }

    const patient = await User.findById(invite.patientId);
    const caregiver = await User.findById(req.session.user.id);

    if (!patient || patient.role !== "patient") {
      return res.json({ success: false, error: "Patient not found" });
    }

    // 🔗 LINK BOTH SIDES
    invite.linked = true;
    await invite.save();

    patient.linked = true;
    patient.linkedUser = caregiver._id;
    await patient.save();

    caregiver.linked = true;
    caregiver.linkedUser = patient._id;
    await caregiver.save();

    // Update session
    req.session.user.linked = true;

    return res.json({ success: true });

  } catch (err) {
    console.error(err);
    res.json({ success: false, error: "Linking failed" });
  }
});

/* ================= DASHBOARD ================= */
router.get("/dashboard", (req, res) => {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }

  // 🔒 BLOCK DASHBOARD UNTIL LINKED
  if (!req.session.user.linked) {
    return res.redirect("/caregiver/link");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
});

module.exports = router;
