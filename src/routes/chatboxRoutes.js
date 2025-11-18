const express = require("express");
const router = express.Router();

const chatboxController = require("../controllers/chatboxController");

// Topics
router.get("/topics", chatboxController.getTopics);
router.post("/topics", chatboxController.createTopic);
router.delete("/topics/:id", chatboxController.deleteTopic);

// Questions
router.get("/questions", chatboxController.getQuestionsByTopic);
router.post("/questions", chatboxController.createQuestion);
router.put("/questions/:id", chatboxController.updateQuestion);
router.delete("/questions/:id", chatboxController.deleteQuestion);

// Flow steps (admin + user)
router.get("/flow/:question_id", chatboxController.getFlowStepsByQuestion);        // admin builder
router.post("/flow", chatboxController.createFlowStep);                            // admin builder
router.put("/flow/:step_id", chatboxController.updateFlowStep);                    // admin builder
router.delete("/flow/:step_id", chatboxController.deleteFlowStep);                 // admin builder

router.get("/flow/start/:question_id", chatboxController.getStartStep);            // user flow
router.get("/flow/next/:step_id/:choice", chatboxController.getNextStep);          // user flow

module.exports = router;
