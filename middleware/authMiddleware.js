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

exports.protect = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  req.user = { id: decoded.id };
  next();
};
