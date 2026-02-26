const PatientSelfCare = require("../models/PatientSelfCare");
const User = require("../models/User");

const STATIC_CAREGIVER_TIPS = [
  {
    title: "Take a short break",
    description: "Pause for two minutes between tasks to reset and breathe."
  },
  {
    title: "Drink water regularly",
    description: "Keep a bottle nearby and hydrate through the day."
  },
  {
    title: "Protect your sleep",
    description: "A steady sleep routine helps with energy and patience."
  },
  {
    title: "Ask for support",
    description: "Share responsibilities with family or friends when needed."
  }
];

async function getLinkedPatientEmail(req) {
  const sessionUser = req.session?.user;
  if (!sessionUser || sessionUser.role !== "caregiver") {
    return null;
  }

  let patientId = sessionUser.patientId;

  if (!patientId) {
    const caregiver = await User.findById(sessionUser.id).select("linkedUser");
    patientId = caregiver?.linkedUser ? caregiver.linkedUser.toString() : null;
  }

  if (!patientId) {
    return null;
  }

  const patient = await User.findById(patientId).select("email");
  return patient?.email || null;
}

function normalizeTipPayload(body) {
  return {
    title: (body.title || "").trim(),
    description: (body.description || "").trim(),
    category: (body.category || "General").trim() || "General"
  };
}

exports.getCaregiverTips = (req, res) => {
  res.json({
    success: true,
    tips: STATIC_CAREGIVER_TIPS
  });
};

exports.addPatientTip = async (req, res) => {
  try {
    const { title, description, category } = normalizeTipPayload(req.body);

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required"
      });
    }

    const patientEmail = await getLinkedPatientEmail(req);
    if (!patientEmail) {
      return res.status(400).json({
        success: false,
        message: "You must be linked to a patient before adding tips"
      });
    }

    const tip = await PatientSelfCare.create({
      patientEmail,
      title,
      description,
      category,
      createdBy: req.session.user.email
    });

    res.status(201).json({
      success: true,
      message: "Self-care tip added successfully",
      tip
    });
  } catch (error) {
    console.error("Add patient self-care tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add self-care tip"
    });
  }
};

exports.getPatientTips = async (req, res) => {
  try {
    const sessionUser = req.session?.user;
    if (!sessionUser) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized"
      });
    }

    let patientEmail = null;

    if (sessionUser.role === "patient") {
      patientEmail = sessionUser.email;
    } else if (sessionUser.role === "caregiver") {
      patientEmail = await getLinkedPatientEmail(req);
    } else {
      return res.status(403).json({
        success: false,
        message: "Invalid role"
      });
    }

    if (!patientEmail) {
      return res.json({
        success: true,
        tips: []
      });
    }

    const tips = await PatientSelfCare.find({
      patientEmail: patientEmail.toLowerCase()
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      tips
    });
  } catch (error) {
    console.error("Get patient self-care tips error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch self-care tips"
    });
  }
};

exports.updatePatientTip = async (req, res) => {
  try {
    const { title, description, category } = normalizeTipPayload(req.body);

    if (!title || !description) {
      return res.status(400).json({
        success: false,
        message: "Title and description are required"
      });
    }

    const patientEmail = await getLinkedPatientEmail(req);
    if (!patientEmail) {
      return res.status(400).json({
        success: false,
        message: "You must be linked to a patient before editing tips"
      });
    }

    const tip = await PatientSelfCare.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({
        success: false,
        message: "Tip not found"
      });
    }

    if (tip.patientEmail !== patientEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "You can only edit tips for your linked patient"
      });
    }

    tip.title = title;
    tip.description = description;
    tip.category = category;
    await tip.save();

    res.json({
      success: true,
      message: "Tip updated successfully",
      tip
    });
  } catch (error) {
    console.error("Update patient self-care tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update self-care tip"
    });
  }
};

exports.deletePatientTip = async (req, res) => {
  try {
    const patientEmail = await getLinkedPatientEmail(req);
    if (!patientEmail) {
      return res.status(400).json({
        success: false,
        message: "You must be linked to a patient before deleting tips"
      });
    }

    const tip = await PatientSelfCare.findById(req.params.id);
    if (!tip) {
      return res.status(404).json({
        success: false,
        message: "Tip not found"
      });
    }

    if (tip.patientEmail !== patientEmail.toLowerCase()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete tips for your linked patient"
      });
    }

    await tip.deleteOne();

    res.json({
      success: true,
      message: "Tip deleted successfully"
    });
  } catch (error) {
    console.error("Delete patient self-care tip error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete self-care tip"
    });
  }
};
