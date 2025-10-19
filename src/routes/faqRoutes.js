const express = require("express");
const router = express.Router();
const {
  getAllFaqs,
  addFaq,
  updateFaq,
  deleteFaq
} = require("../controllers/faqController");

// ✅ Get all FAQs (with optional ?search= query)
router.get("/", getAllFaqs);

// ✅ Add a new FAQ (chat message)
router.post("/", addFaq);

// ✅ Edit an FAQ (only admin or message owner)
router.put("/:id", updateFaq);

// ✅ Delete an FAQ (only admin or message owner)
router.delete("/:id", deleteFaq);

module.exports = router;
