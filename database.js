const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

async function connect() {
  try {
    await mongoose.connect(uri);
    console.log("Connected to MongoDB via Mongoose");
  } catch (err) {
    console.error("MongoDB connection error:", err);
    process.exit(1);
  }
}

function getDb() {
  if (mongoose.connection.readyState !== 1) {
    throw new Error("Database not connected");
  }
  return mongoose.connection.db;
}

module.exports = { connect, getDb };
