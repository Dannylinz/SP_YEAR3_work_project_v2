const jwt = require("jsonwebtoken");
const JWT_SECRET = "SUPER_SECRET_CHANGE_THIS";

exports.verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { user_id, username, email, role_id }
    next();
  } catch (err) {
    console.error("❌ Invalid token:", err);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
};
