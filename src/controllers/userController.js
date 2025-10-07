const pool = require("../services/db");
const bcrypt = require("bcrypt");

// Register
exports.registerUser = async (req, res) => {
  const { username, email, password, full_name } = req.body;
  console.log("Register request:", req.body);

  if (!username || !email || !password) {
    console.log("Missing fields");
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const hashed = await bcrypt.hash(password, 10);
    console.log("Password hashed");

    const sql = `INSERT INTO User (username, email, password, full_name, created_on, active)
                 VALUES (?, ?, ?, ?, NOW(), 1)`;

    pool.query(sql, [username, email, hashed, full_name || ""], (err, result) => {
      if (err) {
        console.error("DB error:", err);
        if (err.code === "ER_DUP_ENTRY") {
          return res.status(400).json({ message: "Email already exists" });
        }
        return res.status(500).json({ message: "Database error", error: err });
      }

      console.log("User registered, ID:", result.insertId);
      res.status(201).json({ message: "User registered successfully" });
    });

  } catch (err) {
    console.error("Error hashing password:", err);
    res.status(500).json({ message: "Server error", error: err });
  }
};

// Login
exports.loginUser = (req, res) => {
  const { email, password } = req.body;
  console.log("Login request:", req.body);

  if (!email || !password) {
    console.log("Missing fields");
    return res.status(400).json({ message: "Missing fields" });
  }

  pool.query("SELECT * FROM User WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("DB error:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }

    if (results.length === 0) {
      console.log("User not found");
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = results[0];
    try {
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        console.log("Password mismatch");
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log("Login successful for user:", user.user_id);
      res.status(200).json({
        message: "Login successful",
        user: { user_id: user.user_id, username: user.username, email: user.email }
      });

    } catch (err) {
      console.error("Password compare error:", err);
      res.status(500).json({ message: "Server error", error: err });
    }
  });
};
