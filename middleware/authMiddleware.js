exports.isAuthenticated = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }
  next();
};

exports.isCaregiver = (req, res, next) => {
  if (req.session.user.role !== "caregiver") {
    return res.status(403).send("Access denied");
  }
  next();
};

exports.isPatient = (req, res, next) => {
  if (req.session.user.role !== "patient") {
    return res.status(403).send("Access denied");
  }
  next();
};
