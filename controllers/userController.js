const User = require("../models/User");

// @desc    Admin: Get all users with full profiles
// @route   GET /api/users/admin/all
exports.getAllUsers = async (req, res) => {
  try {
    // Sort by newest users first
    const users = await User.find({}).select("-password").sort("-createdAt");
    if (!users) {
      return res.send("No users at the moment");
    }
    return res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not fetch users" });
  }
};
exports.getUserProfile = async (req, res) => {
  try {
    // req.user is attached by protect middleware
    const user = await User.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

// @desc    User: Update own profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Basic personal info
    user.firstName = req.body.firstName ?? user.firstName;
    user.middleName = req.body.middleName ?? user.middleName;
    user.lastName = req.body.lastName ?? user.lastName;
    user.sex = req.body.sex ?? user.sex;
    user.maritalStatus = req.body.maritalStatus ?? user.maritalStatus;
    user.occupation = req.body.occupation ?? user.occupation;

    // Address (safe nested update)
    user.address = {
      ...user.address,
      ...req.body.address,
    };

    const updatedUser = await user.save();

    res.json({
      message: "Profile updated successfully",
      user: {
        ...updatedUser.toObject(),
        password: undefined,
      },
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};

// @desc    Admin: Get single user details
// @route   GET /api/users/admin/:id
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: "Invalid User ID" });
  }
};

// @desc    Admin: Update User Profile (Balances, Roles, Account Types)
// @route   PUT /api/users/admin/:id
exports.updateUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (user) {
      // Basic Info
      user.firstName = req.body.firstName || user.firstName;
      user.lastName = req.body.lastName || user.lastName;
      user.email = req.body.email || user.email;

      // Financial Adjustment (The core of Admin power)
      user.balance =
        req.body.balance !== undefined ? req.body.balance : user.balance;
      user.tradingBalance =
        req.body.tradingBalance !== undefined
          ? req.body.tradingBalance
          : user.tradingBalance;
      user.totalProfits =
        req.body.totalProfits !== undefined
          ? req.body.totalProfits
          : user.totalProfits;

      // State & Role
      user.accountType = req.body.accountType || user.accountType;
      user.role = req.body.role || user.role;
      user.isActive =
        req.body.isActive !== undefined ? req.body.isActive : user.isActive;

      // Password logic: Only update if a NEW password is provided in body
      if (req.body.password) {
        user.password = req.body.password;
        // Note: The pre-save hook in your model will handle hashing automatically
      }

      const updatedUser = await user.save();
      res.json({
        message: "User updated successfully",
        user: updatedUser,
      });
    } else {
      res.status(404).json({ message: "User not found" });
    }
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Admin: Delete User
// @route   DELETE /api/users/admin/:id
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Prevent deleting the last admin by accident
    if (
      user.role === "admin" &&
      (await User.countDocuments({ role: "admin" })) <= 1
    ) {
      return res
        .status(400)
        .json({ message: "Cannot delete the only remaining Admin" });
    }

    await user.deleteOne();
    res.json({ message: "User successfully purged from system" });
  } catch (error) {
    res.status(400).json({ message: "Delete operation failed" });
  }
};
