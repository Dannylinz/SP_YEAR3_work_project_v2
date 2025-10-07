const express = require("express");
const router = express.Router();
const sopController = require("../controllers/sopController");

// --- ROUTES ---
router.get("/", sopController.getAllSops);
router.post("/", sopController.addSop);
router.put("/:sop_id", sopController.updateSop);  // ✅ this must match controller name
router.delete("/:sop_id", sopController.deleteSop);

module.exports = router;
