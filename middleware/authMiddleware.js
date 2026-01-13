
/**
 * Middleware to check if user is authenticated
 */
exports.isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

/**
 * Middleware to check if user is a caregiver
 */
exports.isCaregiver = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  if (req.session.user.role !== "caregiver") {
    return res.status(403).send("Access denied: Caregiver role required");
  }

  next();
};

/**
 * Middleware to check if user is a patient
 */
exports.isPatient = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  if (req.session.user.role !== "patient") {
    return res.status(403).send("Access denied: Patient role required");
  }

  next();
};

/**
 * Middleware to check if user is linked
 */
exports.isLinked = async (req, res, next) => {
  try {
    if (!req.session.user) {
      return res.redirect("/auth/login");
    }

    const User = require("../models/User");
    const user = await User.findById(req.session.user.id);

    if (!user || !user.linked) {
      // Redirect based on role
      const redirectPath = user.role === "patient" 
        ? "/patient/welcome" 
        : "/caregiver/link";
      return res.redirect(redirectPath);
    }

    // Ensure patientId is in session for caregivers
    if (user.role === "caregiver" && !req.session.user.patientId && user.linkedUser) {
      req.session.user.patientId = user.linkedUser.toString();
      await req.session.save();
    }

    next();
  } catch (err) {
    console.error("isLinked middleware error:", err);
    res.redirect("/auth/login");
  }
};

/**
 * API middleware to check authentication (returns JSON)
 */
exports.requireAuth = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Please log in" 
    });
  }
  next();
};

/**
 * API middleware to check if caregiver (returns JSON)
 */
exports.requireCaregiver = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Please log in" 
    });
  }

  if (req.session.user.role !== "caregiver") {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Caregiver role required" 
    });
  }

  next();
};

/**
 * API middleware to check if patient (returns JSON)
 */
exports.requirePatient = (req, res, next) => {
  if (!req.session.user) {
    return res.status(401).json({ 
      error: "Unauthorized",
      message: "Please log in" 
    });
  }

  if (req.session.user.role !== "patient") {
    return res.status(403).json({ 
      error: "Forbidden",
      message: "Patient role required" 
    });
  }

  next();
};