const express = require("express");
const router = express.Router();
const {
  createTrader,
  getTraders,
  updateTrader,
  deleteTrader,
  startCopying,
  stopCopying,
} = require("../controllers/traderController.js");
const { protect, admin } = require("../middleware/authMiddleware.js");

// Public/User view (Must be logged in to see the Social Terminal)
router.get("/", protect, getTraders);
// Copy Trading Logic
router.post("/copy/start", protect, startCopying);
router.post("/copy/stop", protect, stopCopying);

// Admin Control
router.post("/", protect, admin, createTrader);
router.put("/:id", protect, admin, updateTrader);
router.delete("/:id", protect, admin, deleteTrader);

module.exports = router;
