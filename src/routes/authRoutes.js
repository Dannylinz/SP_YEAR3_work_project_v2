// src/routes/authRoutes.js
const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Public routes
router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/verify", authController.verifyToken);
router.get("/verify", authController.verifyToken); // Allow both POST and GET

// Cross-system auth cookie setting endpoint
router.get("/set-auth-cookie", (req, res) => {
  const token = req.query.token;
  
  if (!token) {
    console.warn('[SET-AUTH-COOKIE] No token provided');
    return res.status(400).json({ error: 'No token provided' });
  }

  console.log('[SET-AUTH-COOKIE] Setting auth token from query parameter');
  
  // Set HTTP-only cookie for automatic authentication
  res.cookie('authToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    maxAge: 8 * 60 * 60 * 1000, // 8 hours
    path: '/'
  });

  res.status(200).json({ 
    message: 'Auth cookie set successfully',
    cookieSet: true 
  });
});

module.exports = router;
