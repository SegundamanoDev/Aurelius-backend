const express = require("express");
const router = express.Router();
const {
  getTraders,
  getTraderProfile,
  becomeTrader,
  updateTrader,
  deleteTrader,
} = require("../controllers/traderController");
const { protect } = require("../middleware/authMiddleware");
const { upload } = require("../config/cloudinary");

router.get("/", getTraders); // GET /api/traders (with filters)
router.get("/:id", getTraderProfile); // GET /api/traders/:id (detailed stats)
router.post("/enroll", protect, upload.single("profileImage"), becomeTrader);
router.put("/:id", protect, upload.single("profileImage"), updateTrader);
router.delete("/:id", protect, deleteTrader); // DELETE /api/traders/:id

module.exports = router;
