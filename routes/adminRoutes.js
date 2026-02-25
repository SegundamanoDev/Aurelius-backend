const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const { getPendingKYCs, reviewKYC } = require("../controllers/adminController");

router.get("/kyc-pending", protect, admin, getPendingKYCs);
router.patch("/kyc-status/:id", protect, admin, reviewKYC);

module.exports = router;
