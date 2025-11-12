// auth.js
const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { getDb } = require("./database");

const router = express.Router();
const JWT_SECRET = 'da39a3ee5e6b4b0d3255bfef95601890afd80709';

function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required." });

    const db = getDb();
    const existing = await db.collection("users").findOne({ username });
    if (existing)
      return res.status(400).json({ error: "Username already taken." });

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection("users").insertOne({ 
      username, 
      password: hashedPassword,
      isAdmin: false,
      createdAt: new Date()
    });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: 'lax'
    });
    res.json({ success: true, token });
  } catch (e) {
    console.error('Registration error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Username and password required." });

    const db = getDb();
    const user = await db.collection("users").findOne({ username });
    if (!user)
      return res.status(400).json({ error: "Invalid username or password." });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid)
      return res.status(400).json({ error: "Invalid username or password." });

    const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: '24h' });
    res.cookie('token', token, { 
      httpOnly: true, 
      maxAge: 24 * 60 * 60 * 1000,
      secure: true,
      sameSite: 'lax'
    });
    res.json({ success: true, token });
  } catch (e) {
    console.error('Login error:', e);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/logout", (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

module.exports = { router, authMiddleware };
