const express = require("express");
const router = express.Router();

const {
  createTrader,
  getTraders,
  getTraderById,
  updateTrader,
  deleteTrader,
  startCopying,
} = require("../controllers/traderController");

const { protect, admin } = require("../middleware/authMiddleware");

// ===== PUBLIC =====
router.post("/copy/start", protect, startCopying);
router.get("/", getTraders);
router.post("/", protect, admin, createTrader);
router.get("/:id", getTraderById);

// ===== ADMIN =====
router.put("/:id", protect, admin, updateTrader);
router.delete("/:id", protect, admin, deleteTrader);

module.exports = router;
