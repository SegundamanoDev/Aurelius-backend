const express = require("express");
const router = express.Router();
const {
  registerUser,
  loginUser,
  setup2FA,
  verifyAndEnable2FA,
  verifyLogin2FA,
  changePassword,
  forgotPassword,
  resetPassword,
} = require("../controllers/authController.js");
const { protect } = require("../middleware/authMiddleware.js");

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Standard registration
router.post("/register", registerUser);

// Standard login (returns 2FA_REQUIRED if enabled)
router.post("/login", loginUser);

// Final step of login if 2FA is required
// (Note: No 'protect' middleware here because the user isn't logged in yet)
router.post("/2fa/verify-login", verifyLogin2FA);

// ==========================================
// PROTECTED ROUTES (Requires JWT Token)
// ==========================================

// Change password for logged-in users
router.post("/change-password", protect, changePassword);

// Get the QR code and Secret for 2FA setup
router.get("/2fa/setup", protect, setup2FA);

// Verify the first-time code and permanently enable 2FA
router.post("/2fa/verify", protect, verifyAndEnable2FA);
router.post("/forgot-password", forgotPassword);
router.patch("/reset-password/:token", resetPassword);

module.exports = router;
