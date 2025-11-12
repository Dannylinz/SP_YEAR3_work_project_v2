// src/controllers/authController.js
const pool = require("../services/authDb");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "SUPER_SECRET_CHANGE_THIS"; // use env var later
const JWT_EXPIRES_IN = "8h";

exports.register = async (req, res) => {
  try {
    const { username, email, password, role_id = 2 } = req.body;
    if (!username || !email || !password)
      return res.status(400).json({ message: "Missing fields" });

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO Users (username, email, password_hash, role_id) VALUES (?, ?, ?, ?)",
      [username, email, hash, role_id]
    );

    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("❌ [register]", err);
    if (err.code === "ER_DUP_ENTRY")
      return res.status(400).json({ message: "Email already exists" });
    res.status(500).json({ message: "Server error" });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Missing credentials" });

    const [rows] = await pool.query("SELECT * FROM Users WHERE email = ?", [email]);
    const user = rows[0];
    if (!user) return res.status(401).json({ message: "Invalid login" });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ message: "Invalid login" });

    const token = jwt.sign(
      {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("❌ [login]", err);
    res.status(500).json({ message: "Server error" });
  }
};
