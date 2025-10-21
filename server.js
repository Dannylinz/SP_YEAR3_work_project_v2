const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const userRoutes = require("./src/routes/userRoutes");
const sopRoutes = require("./src/routes/sopRoutes");
const projectRoutes = require("./src/routes/projectRoutes");
const faqRoutes = require("./src/routes/faqRoutes");

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

// ✅ Serve static files first
app.use("/uploads", express.static(uploadDir)); // Serve uploaded files properly
app.use(express.static(path.join(__dirname, "public"))); // Serve HTML/JS/CSS

// ----------------------------
// Routes
app.use("/api/users", userRoutes);
app.use("/api/sops", sopRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/faqs", faqRoutes);

// ----------------------------
// Health check
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
