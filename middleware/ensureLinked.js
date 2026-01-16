module.exports = function ensureLinked(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  next();
};
