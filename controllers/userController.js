const User = require("../models/User");
const Wallet = require("../models/Wallet");

// @desc    Admin: Get all users with full profiles + Wallets
// @route   GET /api/users/admin/all
exports.getAllUsers = async (req, res) => {
  try {
    // Populate wallet to see balances in the admin table
    const users = await User.find({})
      .select("-password")
      .populate("wallet")
      .sort("-createdAt");

    if (!users || users.length === 0) {
      return res.status(200).json([]);
    }
    return res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error: Could not fetch users" });
  }
};

// @desc    User: Get own profile
// @route   GET /api/users/profile
exports.getUserProfile = async (req, res) => {
  try {
    // Crucial: Populate wallet so Dashboard shows balances immediately
    const user = await User.findById(req.user._id)
      .select("-password")
      .populate("wallet");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(user);
  } catch (error) {
    res.status(500).json({ message: "Server error fetching profile" });
  }
};

exports.updateMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Existing Personal Details
    user.firstName = req.body.firstName ?? user.firstName;
    user.middleName = req.body.middleName ?? user.middleName;
    user.lastName = req.body.lastName ?? user.lastName;
    user.sex = req.body.sex ?? user.sex;
    user.maritalStatus = req.body.maritalStatus ?? user.maritalStatus;
    user.occupation = req.body.occupation ?? user.occupation;
    user.address = { ...user.address, ...req.body.address };

    // 2. Added Social/Strategist Details (for your new React component)
    user.bio = req.body.bio ?? user.bio;
    user.twitter = req.body.twitter ?? user.twitter;
    user.isPublic = req.body.isPublic ?? user.isPublic;

    // 3. Added Financial Protocol (Collection of Addresses)
    // This ensures your Withdraw component auto-fill works
    if (req.body.financialProtocol) {
      user.financialProtocol = {
        ...user.financialProtocol,
        ...req.body.financialProtocol,
      };
    }

    const updatedUser = await user.save();

    // Re-populate wallet to keep the frontend synced
    await updatedUser.populate("wallet");

    res.json({
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({
      message: "Failed to update profile",
      error: error.message,
    });
  }
};
// @desc    Admin: Get single user details
exports.getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select("-password")
      .populate("wallet");

    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (error) {
    res.status(400).json({ message: "Invalid User ID" });
  }
};

// @desc    Admin: Update User Profile & Balances
exports.updateUserAdmin = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 1. Update User Basic Info
    user.firstName = req.body.firstName || user.firstName;
    user.lastName = req.body.lastName || user.lastName;
    user.email = req.body.email || user.email;
    user.role = req.body.role || user.role;
    user.kycStatus = req.body.kycStatus || user.kycStatus;

    if (req.body.password) {
      user.password = req.body.password;
    }

    // 2. Update Associated Wallet Balances (The correct way)
    if (req.body.wallet) {
      await Wallet.findOneAndUpdate(
        { user: user._id },
        {
          totalBalance: req.body.wallet.totalBalance ?? undefined,
          freeBalance: req.body.wallet.freeBalance ?? undefined,
          allocatedBalance: req.body.wallet.allocatedBalance ?? undefined,
          currency: req.body.wallet.currency?.toUpperCase() ?? undefined,
        },
        { omitUndefined: true },
      );
    }

    const updatedUser = await user.save();
    await updatedUser.populate("wallet");

    res.json({
      message: "User and Wallet updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// @desc    Admin: Delete User & Associated Wallet
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (
      user.role === "admin" &&
      (await User.countDocuments({ role: "admin" })) <= 1
    ) {
      return res.status(400).json({ message: "Cannot delete the last Admin" });
    }

    // Delete both User and Wallet
    await Wallet.deleteOne({ user: user._id });
    await user.deleteOne();

    res.json({ message: "User and associated wallet successfully purged" });
  } catch (error) {
    res.status(400).json({ message: "Delete operation failed" });
  }
};

exports.updateFinancialProtocol = async (req, res) => {
  try {
    const { trc20, erc20, btc, taxId, displayCurrency } = req.body;

    const updateData = {};
    if (trc20 !== undefined) updateData["financialProtocol.usdt_trc20"] = trc20;
    if (erc20 !== undefined) updateData["financialProtocol.usdt_erc20"] = erc20;
    if (btc !== undefined) updateData["financialProtocol.btc_address"] = btc;
    if (taxId !== undefined) updateData["financialProtocol.taxId"] = taxId;

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updateData },
      { new: true, runValidators: true },
    ).populate("wallet");

    const userJson = updatedUser.toObject();

    if (displayCurrency) {
      const wallet = await Wallet.findOneAndUpdate(
        { user: req.user._id },
        { currency: displayCurrency.toUpperCase() },
        { new: true },
      );
      userJson.wallet = wallet;
    }

    res.status(200).json({ success: true, user: userJson });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// @desc    Upload KYC Document
// @route   POST /api/users/kyc-upload
// @access  Private
exports.uploadKyc = async (req, res) => {
  try {
    if (!req.file) {
      return res
        .status(400)
        .json({ message: "Please upload a valid image file" });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update the nested kycDetails and top-level status
    user.kycStatus = "pending";
    user.kycDetails = {
      ...user.kycDetails,
      documentUrl: req.file.path, // Cloudinary Secure URL
      submittedAt: new Date(),
    };

    await user.save();

    res.status(200).json({
      message: "KYC documents uploaded successfully",
      user: {
        kycStatus: user.kycStatus,
        documentUrl: user.kycDetails.documentUrl,
      },
    });
  } catch (error) {
    console.error("KYC Upload Error:", error);
    res
      .status(500)
      .json({ message: "Internal Server Error during KYC process" });
  }
};
