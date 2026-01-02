exports.getDashboard = (req, res) => {
  res.sendFile("dashboard.html", {
    root: "views/caregiver",
  });
};
