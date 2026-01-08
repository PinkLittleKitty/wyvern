const { MongoClient } = require('mongodb');
require('dotenv').config();
const uri = process.env.MONGODB_URI;
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
