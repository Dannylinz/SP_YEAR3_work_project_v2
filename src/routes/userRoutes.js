const express = require("express");
const router = express.Router();
const userController = require("../controllers/userController");
console.log("✅ userController loaded:", typeof userController.registerUser, typeof userController.loginUser);
router.post("/register", userController.registerUser);
router.post("/login", userController.loginUser);

module.exports = router;
