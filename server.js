require('dotenv').config(); // This MUST be the first line
const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const userRoutes = require("./src/routes/userRoutes");
const sopRoutes = require("./src/routes/sopRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const faqRoutes = require("./src/routes/faqRoutes");
const chatboxRoutes = require("./src/routes/chatboxRoutes");
const authRoutes = require("./src/routes/authRoutes");
const profileRoutes = require("./src/routes/profileRoutes");
const leaveRoutes = require("./src/routes/leaveRoutes");
const notificationRoutes = require("./src/routes/notificationRoutes");

const app = express();

// ----------------------------
// Ensure uploads folder exists
const uploadDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log("✅ Uploads folder created");
}

// ----------------------------
// Middleware
app.use(cors());
app.use(bodyParser.json());

//////////////////////////////////////////////////////
// 🔍 REQUEST/RESPONSE LOGGING MIDDLEWARE
//////////////////////////////////////////////////////
app.use((req, res, next) => {
  const start = Date.now();
  const timestamp = new Date().toISOString();
  const clientIp = req.ip || req.connection.remoteAddress;

  console.log(`\n📥 [AUTH-SYSTEM:3000] INCOMING REQUEST`);
  console.log(`   - Timestamp: ${timestamp}`);
  console.log(`   - Client IP: ${clientIp}`);
  console.log(`   - Method: ${req.method}`);
  console.log(`   - Path: ${req.path}`);
  if (Object.keys(req.query).length > 0) {
    console.log(`   - Query: ${JSON.stringify(req.query)}`);
  }

  // Intercept res.json to log response
  const originalJson = res.json;
  res.json = function(data) {
    const duration = Date.now() - start;
    console.log(`📤 [AUTH-SYSTEM:3000] OUTGOING RESPONSE`);
    console.log(`   - Status: ${res.statusCode}`);
    console.log(`   - Duration: ${duration}ms`);
    if (typeof data === 'object' && Object.keys(data).length < 5) {
      console.log(`   - Response: ${JSON.stringify(data).substring(0, 100)}`);
    }
    console.log(`   ============================================================`);
    return originalJson.call(this, data);
  };

  next();
});

// ✅ Serve static files first
app.use("/uploads", express.static(uploadDir)); // Serve uploaded files properly
app.use(express.static(path.join(__dirname, "public"))); // Serve HTML/JS/CSS

// ----------------------------
// Routes
app.use("/api/users", userRoutes);
app.use("/api/sops", sopRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/faqs", faqRoutes);
app.use("/api/chatbox", chatboxRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/leaves", leaveRoutes);
app.use("/api/notifications", notificationRoutes);
// ----------------------------
app.use("/pictures", express.static(path.join(__dirname, "pictures")));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Health check
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
