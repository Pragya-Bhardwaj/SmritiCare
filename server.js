require("dotenv").config();
const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const path = require("path");

const authRoutes = require("./routes/authRoutes");
const pairingRoutes = require("./routes/pairingRoutes");
const memoryRoutes = require("./routes/memoryRoutes");

const patientRoutes = require("./routes/patientRoutes");
const caregiverRoutes = require("./routes/caregiverRoutes");

const MongoStore = require("connect-mongo");


const app = express();

/* ================= DATABASE ================= */
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.error("MongoDB error:", err));

/* ================= MIDDLEWARE ================= */
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "smriticasecret",
    resave: false,
    saveUninitialized: false
  })
);


app.use(
  session({
    secret: process.env.SESSION_SECRET || "smriticasecret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions"
    })
  })
);

/* ================= STATIC FILES ================= */
app.use(express.static(path.join(__dirname, "public")));

/* ================= VIEW FILES ================= */
app.use("/views", express.static(path.join(__dirname, "views")));

/* ================= ROUTES ================= */
app.use("/auth", authRoutes);
app.use("/pair", pairingRoutes);



app.use("/patient", patientRoutes);
app.use("/caregiver", caregiverRoutes);

app.use("/memory", memoryRoutes);

/* ================= FALLBACK ================= */
app.get("/", (req, res) => {
  res.redirect("/auth/login");
});

/* ================= START SERVER ================= */
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
