require("dotenv").config();
const express = require("express");
const session = require("express-session");
const connectDB = require("./config/db");

const authRoutes = require("./routes/authRoutes");

const caregiverRoutes = require("./routes/caregiverRoutes");
const patientRoutes = require("./routes/patientRoutes");
const memoryRoutes = require("./routes/memoryRoutes");



const app = express();
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
  })
);

app.use("/auth", authRoutes);
app.use("/caregiver", caregiverRoutes);
app.use("/patient", patientRoutes);
app.use(memoryRoutes);



// Static files
app.use(express.static("public"));

// Test route
app.get("/", (req, res) => {
  res.send("SmritiCare Server Running");
});

// Server start
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
