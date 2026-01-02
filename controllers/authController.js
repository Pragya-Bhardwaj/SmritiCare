const bcrypt = require("bcryptjs");
const User = require("../models/User");
const CaregiverProfile = require("../models/CaregiverProfile");
const PatientProfile = require("../models/PatientProfile");

exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).send("User already exists");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
    });

    if (role === "caregiver") {
      await CaregiverProfile.create({ userId: user._id });
    } else {
      await PatientProfile.create({ userId: user._id });
    }

    req.session.user = {
      id: user._id,
      role: user.role,
    };

    res.redirect("/auth/login");
  } catch (error) {
    console.error(error);
    res.status(500).send("Signup failed");
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).send("Invalid credentials");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).send("Invalid credentials");
    }

    req.session.user = {
      id: user._id,
      role: user.role,
    };

    if (user.role === "caregiver") {
      return res.redirect("/caregiver/dashboard");
    } else {
      return res.redirect("/patient/dashboard");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Login failed");
  }
};

exports.logout = (req, res) => {
  req.session.destroy(() => {
    res.redirect("/auth/login");
  });
};
