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
app.use(express.static(path.join(__dirname, "public"))); // public folder for HTML
app.use("/uploads", express.static(uploadDir)); // serve uploaded files

// ----------------------------
// Routes
app.use("/api/users", userRoutes);
app.use("/api/sops", sopRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/faqs", faqRoutes);

// ----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
