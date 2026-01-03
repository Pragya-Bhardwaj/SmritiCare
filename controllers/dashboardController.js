const path = require("path");

exports.patientDashboard = (req, res) => {
  if (!req.session.user || req.session.user.role !== "patient") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/patient/dashboard.html")
  );
};

exports.caregiverDashboard = (req, res) => {
  if (!req.session.user || req.session.user.role !== "caregiver") {
    return res.redirect("/auth/login");
  }

  res.sendFile(
    path.join(__dirname, "../views/caregiver/dashboard.html")
  );
};
