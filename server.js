require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const MongoStore = require("connect-mongo");

/* ================= ROUTES ================= */
const authRoutes = require("./routes/authRoutes");
const pairingRoutes = require("./routes/pairingRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const patientRoutes = require("./routes/patientRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");
const patientApiRoutes = require("./routes/patientApiRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
    process.exit(1);
  });

/* ================= BODY PARSERS ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= SESSION CONFIG ================= */
app.use(
  session({
    name: "smriticare.sid",
    secret: process.env.SESSION_SECRET || "smriticasecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));

/* ================= ROUTE MOUNTS ================= */
app.use("/auth", authRoutes);
app.use("/pair", pairingRoutes);
app.use("/patient", patientRoutes);
app.use("/caregiver", caregiverRoutes);
app.use("/memory", memoryRoutes);
app.use("/api/patient", patientApiRoutes);
app.use(profileRoutes);

/* ================= ROOT ================= */
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
