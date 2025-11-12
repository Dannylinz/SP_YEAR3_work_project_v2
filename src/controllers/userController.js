// ✅ Import correct database pools
const pool = require("../services/db");           // Main Meganet database (projects, SOPs, etc.)
const authPool = require("../services/authDb");   // Auth database (users, roles)
const bcrypt = require("bcrypt");

// =============================================================
// REGISTER (Only Admin can create users)
// =============================================================
exports.registerUser = async (req, res) => {
  console.log("📨 Register request received:", req.body);

  const { username, email, password, full_name, role_id, creator_id } = req.body;
  if (!username || !email || !password || !creator_id)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    // ✅ 1. Verify that the creator exists in the AUTH database
    const [creator] = await authPool.query(
      "SELECT role_id FROM User WHERE user_id = ?",
      [creator_id]
    );
    if (creator.length === 0)
      return res.status(403).json({ message: "Invalid creator" });

    // ✅ 2. Check that the creator is an Admin
    if (creator[0].role_id !== 1)
      return res
        .status(403)
        .json({ message: "Only Admins can register new users" });

    // ✅ 3. Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    console.log("🔐 Password hashed");

    // ✅ 4. Insert new user into AUTH DB (not main DB)
    const sql = `
      INSERT INTO User (username, email, password, full_name, role_id, created_on, active)
      VALUES (?, ?, ?, ?, ?, NOW(), 1)
    `;

    const [result] = await authPool.query(sql, [
      username,
      email,
      hashedPassword,
      full_name || "",
      role_id || 2, // Default role = Intern
    ]);

    console.log("✅ User registered successfully with ID:", result.insertId);

    return res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("💥 Register error:", err);
    if (err.code === "ER_DUP_ENTRY")
      return res
        .status(400)
        .json({ message: "Email or username already registered" });
    return res
      .status(500)
      .json({ message: "Database error", error: err.message });
  }
};

// =============================================================
// LOGIN (Authenticate user from meganet_auth DB)
// =============================================================
exports.loginUser = async (req, res) => {
  console.log("📨 Login request received:", req.body);

  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: "Missing required fields" });

  try {
    // ✅ Use the auth DB for login
    const [results] = await authPool.query(
      "SELECT * FROM User WHERE email = ?",
      [email]
    );
    console.log("🔍 Query results:", results);

    if (results.length === 0)
      return res.status(401).json({ message: "Invalid credentials" });

    const user = results[0];

    // ✅ Compare hashed password
    const match = await bcrypt.compare(password, user.password);
    console.log("🔑 Password match:", match);

    if (!match) return res.status(401).json({ message: "Invalid credentials" });

    console.log("✅ Login successful for:", user.username);
    return res.status(200).json({
      message: "Login successful",
      user: {
        user_id: user.user_id,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
      },
    });
  } catch (err) {
    console.error("💥 Login error:", err);
    return res
      .status(500)
      .json({ message: "Database error", error: err.message });
  }
};
