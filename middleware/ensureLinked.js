module.exports = function ensureLinked(req, res, next) {
  if (!req.session.user) {
    return res.redirect("/auth/login");
  }

  if (!req.session.user.linked) {
    return res.redirect("/waiting");
  }

  next();
};
