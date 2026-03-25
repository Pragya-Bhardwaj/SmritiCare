const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      dbName: "smriticare", // 🔥 FORCE correct DB
    });

    console.log(`✓ MongoDB Connected: ${conn.connection.host}`);
    console.log(`📂 Database: ${conn.connection.name}`);
  } catch (error) {
    console.error("✗ MongoDB Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;