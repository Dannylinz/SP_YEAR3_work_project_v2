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

// 🧩 File upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});

const upload = multer({ storage });

// ✅ Routes
router.get("/", getAllFaqs);
router.post("/", upload.single("file"), addFaq);

// 🟨 Important: use multer for PUT too, since file can be replaced
router.put("/:id", upload.single("file"), updateFaq);

router.delete("/:id", deleteFaq);

module.exports = router;
