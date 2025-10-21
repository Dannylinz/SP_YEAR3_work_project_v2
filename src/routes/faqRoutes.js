// src/routes/faqRoutes.js
const express = require("express");
const multer = require("multer");
const path = require("path");
const {
  getAllFaqs,
  addFaq,
  updateFaq,
  deleteFaq
} = require("../controllers/faqController");

const router = express.Router();

// 🧩 Setup file upload using Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/"); // folder where files will be saved
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ Get all FAQs (with optional ?search= query)
router.get("/", getAllFaqs);

// ✅ Add a new FAQ (chat message + optional file)
router.post("/", upload.single("file"), addFaq);

// ✅ Edit an FAQ (only admin or message owner)
router.put("/:id", updateFaq);

// ✅ Delete an FAQ (only admin or message owner)
router.delete("/:id", deleteFaq);

module.exports = router;
