// db.js — connects to MongoDB using Mongoose.
feature/NFR-06-modular-architecture
//
// By default this points at a local MongoDB instance
// (mongodb://127.0.0.1:27017/smartbudget). To use MongoDB Atlas (a free
// cloud-hosted database — no local install needed) instead, set the
// MONGODB_URI environment variable to your Atlas connection string before
// starting the server, e.g.:
//
//   MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/smartbudget" npm start

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/smartbudget";

mongoose
  .connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB at", MONGODB_URI))
  .catch((err) => {
    console.error("Could not connect to MongoDB:", err.message);
    console.error("Is MongoDB running locally? Install it or set MONGODB_URI to an Atlas connection string.");
    process.exit(1);
  });

module.exports = mongoose;
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
main
