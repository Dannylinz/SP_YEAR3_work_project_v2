const express = require("express");
const router = express.Router();
const profileController = require("../controllers/profileController");

// Profile info
router.get("/:id", profileController.getProfile);

// Items created by this user
router.get("/:id/sops", profileController.getUserSOPs);
router.get("/:id/chatbox", profileController.getUserChatbox);
router.get("/:id/faqs", profileController.getUserFAQs);

module.exports = router;
