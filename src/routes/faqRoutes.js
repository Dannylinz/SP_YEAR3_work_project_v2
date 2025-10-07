const express = require("express");
const router = express.Router();
const { getAllFaqs, addFaq } = require("../controllers/faqController");

router.get("/", getAllFaqs);
router.post("/", addFaq);

module.exports = router;
