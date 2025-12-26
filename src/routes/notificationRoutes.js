const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");

router.get("/:user_id", notificationController.getNotifications);
router.put("/:user_id/read", notificationController.markAsRead);

module.exports = router;