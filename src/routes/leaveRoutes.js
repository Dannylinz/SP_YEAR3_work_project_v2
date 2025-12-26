const express = require("express");
const router = express.Router();
const multer = require("multer");
const leaveController = require("../controllers/leaveController");

// MC Upload config
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/mc"),
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname)
});
const upload = multer({ storage });

// Routes
router.get("/", leaveController.getLeaves);
router.post("/", upload.single("mc"), leaveController.submitLeave);
router.put("/:leave_id/status", leaveController.updateLeaveStatus);
router.post("/:leave_id/mc", upload.single("mc"), leaveController.uploadMC);
router.put("/:leave_id/status", leaveController.updateLeaveStatus);

module.exports = router;
