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

// =======================
// PUBLIC / USER ROUTES
// =======================

// Get public traders (Discovery Grid)
router.get("/", getTraders);

// Start copy trading
router.post("/copy/start", protect, startCopying);

// Stop copy trading
router.post("/stop-copying", protect, stopCopying);

// =======================
// ADMIN ROUTES
// =======================

router.post("/", protect, admin, createTrader);
router.put("/:id", protect, admin, updateTrader);
router.delete("/:id", protect, admin, deleteTrader);

module.exports = router;
