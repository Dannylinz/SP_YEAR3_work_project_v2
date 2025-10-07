// src/controllers/userController.js
const pool = require("../services/db");
const bcrypt = require("bcrypt");

// Register
exports.registerUser = async (req, res) => {
  const { username, email, password, full_name } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ message: "Missing fields" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO User (username, email, password, full_name, created_on, active)
                 VALUES (?, ?, ?, ?, NOW(), 1)`;
    pool.query(sql, [username, email, hashed, full_name || ""], (err, result) => {
      if (err) return res.status(500).json({ message: "DB error", error: err });
      res.status(201).json({ message: "User registered successfully" });
    });
  } catch (e) {
    res.status(500).json({ message: "Error hashing password" });
  }
};

// Login
exports.loginUser = (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Missing fields" });

  pool.query("SELECT * FROM User WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (results.length === 0) return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    res.status(200).json({
      message: "Login successful",
      user: { user_id: user.user_id, username: user.username, email: user.email }
    });
  });
};
