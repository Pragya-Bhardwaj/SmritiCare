require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");
const MongoStore = require("connect-mongo");

const app = express();

/* DATABASE CONNECTION */
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB connection error:", err));

/* MIDDLEWARE */

// Body parsers
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Session configuration
app.use(
  session({
    name: "smriticare.sid",
    secret: process.env.SESSION_SECRET || "smriticare-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 7 * 24 * 60 * 60 // 7 days in seconds
    }),
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // HTTPS in production
      maxAge: 1000 * 60 * 60 * 24, // 1 day
      sameSite: "lax"
    }
  })
);

// Request logging (development only)
if (process.env.NODE_ENV !== "production") {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`, {
      session: req.session?.user?.email || "none",
      role: req.session?.user?.role || "none"
    });
    next();
  });
}

/* STATIC FILES */
app.use(express.static(path.join(__dirname, "public")));
app.use("/views", express.static(path.join(__dirname, "views")));

/* ROUTES */
const authRoutes = require("./routes/authRoutes");
const patientRoutes = require("./routes/patientRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");
const memoryRoutes = require("./routes/memoryRoutes");
const reminderRoutes = require("./routes/reminderRoutes");
const patientApiRoutes = require("./routes/patientApiRoutes");
const profileRoutes = require("./routes/profileRoutes");

// Mount routes
app.use("/auth", authRoutes);
app.use("/patient", patientRoutes);
app.use("/caregiver", caregiverRoutes);
app.use("/memory", memoryRoutes);
app.use("/reminder", reminderRoutes);
app.use("/api/patient", patientApiRoutes);
app.use("/", profileRoutes);


/* ROOT ROUTE */
app.get("/", (req, res) => {
  if (req.session.user) {
    // Redirect logged-in users to their dashboard
    const redirect = req.session.user.role === "patient" 
      ? "/patient/dashboard" 
      : "/caregiver/dashboard";
    return res.redirect(redirect);
  }
  res.redirect("/auth/login");
});

/* 404 HANDLER */
app.use((req, res) => {
  res.status(404).send(`
    <h1>404 - Page Not Found</h1>
    <p>The page you're looking for doesn't exist.</p>
    <a href="/">Go Home</a>
  `);
});

/* ERROR HANDLER */
app.use((err, req, res, next) => {
  console.error(" Server error:", err);
  res.status(500).send(`
    <h1>500 - Server Error</h1>
    <p>Something went wrong on our end.</p>
    <a href="/">Go Home</a>
  `);
});

/* START SERVER */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(` SmritiCare server running on http://localhost:${PORT}`);
});