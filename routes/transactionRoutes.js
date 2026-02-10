const express = require("express");
const router = express.Router();
const {
  depositFunds,
  requestWithdrawal,
  handleServicePurchase,
  getMyTransactions,
  getAllTransactions,
  updateTransactionStatus,
  injectLedgerEntry,
} = require("../controllers/transactionController.js");
const { protect, admin } = require("../middleware/authMiddleware.js");

// --- USER PRIVATE ROUTES ---
// All these require the user to be logged in (protect)

router.get("/my-history", protect, getMyTransactions);
router.post("/deposit", protect, depositFunds);
router.post("/withdraw", protect, requestWithdrawal);

// Handles Upgrades, Staking, Signal Purchases, and Funding Trading
router.post("/purchase-service", protect, handleServicePurchase);

// --- ADMIN ONLY ROUTES ---
// These require the user to be an admin

router.get("/admin/all", protect, admin, getAllTransactions);
router.put("/admin/update-status", protect, admin, updateTransactionStatus);
router.post("/admin/inject", protect, admin, injectLedgerEntry);

module.exports = router;
