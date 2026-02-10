const express = require("express");
const router = express.Router();
const {
  getAllUsers,
  getUserById,
  updateUserAdmin,
  deleteUser,
  getUserProfile,
  updateMyProfile,
} = require("../controllers/userController");
const { protect, admin } = require("../middleware/authMiddleware");

router.get("/profile", protect, getUserProfile);
router.put("/profile", protect, updateMyProfile);
// All routes here require Admin privileges

router.get("/admin/all", protect, admin, getAllUsers);
router.get("/admin/:id", protect, admin, getUserById);
router.put("/admin/:id", protect, admin, updateUserAdmin);
router.delete("/admin/:id", protect, admin, deleteUser);

module.exports = router;
