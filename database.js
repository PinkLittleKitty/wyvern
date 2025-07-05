const { MongoClient } = require('mongodb');

// Replace with your actual MongoDB connection string from AIO DBH
const uri = "URL";

const client = new MongoClient(uri);

let db;

async function connect() {
  try {
    await client.connect();
    db = client.db("wyvern");
    console.log("Connected to MongoDB");
  } catch (err) {
    console.error("MongoDB connection error:", err);
  }
}

function getDb() {
  if (!db) throw new Error("Database not connected");
  return db;
}

module.exports = { connect, getDb };
