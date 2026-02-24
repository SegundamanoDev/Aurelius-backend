const express = require("express");
const router = express.Router();
const {
  getTraders,
  getTraderProfile,
  becomeTrader,
  updateTrader,
  deleteTrader,
} = require("../controllers/traderController");

// Import your Auth Middlewares (You will need to create these)
// protect: ensures the user is logged in via JWT
// authorize: ensures the user has a specific role (e.g., 'admin')
const { protect } = require("../middleware/authMiddleware");

/**
 * PUBLIC ROUTES
 * These are used for the "Copy Trade" discovery landing page
 */
router.get("/", getTraders); // GET /api/traders (with filters)
router.get("/:id", getTraderProfile); // GET /api/traders/:id (detailed stats)

/**
 * PROTECTED ROUTES
 * User must be logged in to perform these actions
 */
router.post("/enroll", protect, becomeTrader); // POST /api/traders/enroll (Upgrade user to trader)

/**
 * ADMIN OR OWNER ONLY ROUTES
 */
router.put("/:id", protect, updateTrader); // PUT /api/traders/:id
router.delete("/:id", protect, deleteTrader); // DELETE /api/traders/:id

module.exports = router;
