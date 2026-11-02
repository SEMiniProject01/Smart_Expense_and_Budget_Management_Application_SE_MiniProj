// db.js — connects to MongoDB using Mongoose.
const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartbudget";

async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB successfully.");
    return mongoose;
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    throw error;
  }
}

if (mongoose.connection.readyState === 0) {
  connectDB().catch(() => {});
}

module.exports = { mongoose, connectDB };
