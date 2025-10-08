const express = require("express");
const router = express.Router();
const sopController = require("../controllers/sopController"); // make sure path is correct

// SOP routes
router.get("/", sopController.getAllSops);      // Fetch all SOPs
router.post("/", sopController.addSop);         // Add a new SOP
router.put("/:sop_id", sopController.updateSop); // Update an SOP
router.delete("/:sop_id", sopController.deleteSop); // Delete an SOP

// SOP category routes
router.get("/category", sopController.getAllCategories);
router.post("/category", sopController.addCategory);

module.exports = router;
