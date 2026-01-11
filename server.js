require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const MongoStore = require("connect-mongo");

const authRoutes = require("./routes/authRoutes");
const pairingRoutes = require("./routes/pairingRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const patientRoutes = require("./routes/patientRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");

const app = express();

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Atlas connected"))
  .catch(err => console.error("❌ MongoDB error:", err));

/* ================= BODY PARSERS ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ================= SESSION ================= */
app.use(
  session({
    name: "smriticare.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions"
    }),
    cookie: {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));

/* ================= ROUTES ================= */
app.use("/auth", authRoutes);
app.use("/pair", pairingRoutes);
app.use("/patient", patientRoutes);
app.use("/caregiver", caregiverRoutes);
app.use("/memory", memoryRoutes);
app.use("/api/patient", require("./routes/patientApiRoutes"));

/* ================= FALLBACK ================= */
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
