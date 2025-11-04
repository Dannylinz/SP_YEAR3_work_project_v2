// routes/chatboxRoute.js
const express = require("express");
const router = express.Router();
const chatboxCtrl = require("../controllers/chatboxController");

// Topics
router.get("/topics", chatboxCtrl.getTopics);
router.post("/topics", chatboxCtrl.createTopic);           // admin only
router.delete("/topics/:id", chatboxCtrl.deleteTopic);     // admin only

// Questions
router.get("/questions", chatboxCtrl.getQuestionsByTopic);
router.post("/questions", chatboxCtrl.createQuestion);     // admin only
router.put("/questions/:id", chatboxCtrl.updateQuestion);  // admin only
router.delete("/questions/:id", chatboxCtrl.deleteQuestion); // admin only

module.exports = router;
