const express = require("express");
const router = express.Router();
const {
  startCopy,
  stopCopy,
  getMyCopies,
} = require("../controllers/copyController");
const { protect } = require("../middleware/authMiddleware");

router.use(protect); // Secure all routes

router.post("/start", startCopy);
router.get("/my", getMyCopies);
router.delete("/stop/:id", stopCopy);

module.exports = router;
