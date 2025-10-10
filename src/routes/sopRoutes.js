const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const sopController = require("../controllers/sopController");

// File storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });

// ----------------------------
// SOP routes
router.get("/", sopController.getAllSops);
router.post("/", upload.single("file"), sopController.addSop);
router.put("/:sop_id", upload.single("file"), sopController.updateSop); // 🔹 Added multer
router.delete("/:sop_id", sopController.deleteSop);

// ----------------------------
// SOP category routes
router.get("/category", sopController.getAllCategories);
router.post("/category", sopController.addCategory);

// ----------------------------
// File routes
router.post("/:sop_id/upload", upload.single("file"), sopController.uploadAttachment);
router.get("/:sop_id/files", sopController.getSopFiles);

module.exports = router;
