const express = require("express");
const router = express.Router();
const {
  getWallet,
  deposit,
  withdraw,
} = require("../controllers/walletController");
const { protect, admin } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary.js");

// All wallet routes require a logged-in user
router.use(protect);

router.get("/", getWallet);
router.post("/deposit", protect, upload.single("my_file"), deposit);
router.post("/withdraw", withdraw);

module.exports = router;
