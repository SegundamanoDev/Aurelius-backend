const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

/**
 * @desc Get user wallet
 */
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user.id });
    if (!wallet) return res.status(404).json({ message: "Wallet not found" });

    res.status(200).json({ success: true, wallet });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Deposit funds with ACID Transaction
 */
exports.deposit = async (req, res) => {
  try {
    const { amount, method, referenceId } = req.body;
    if (!req.file) throw new Error("No proof of payment uploaded");

    // We ONLY create the transaction log here.
    // We do NOT update wallet balances yet.
    const transaction = await Transaction.create({
      user: req.user._id,
      type: "deposit",
      amount: Number(amount),
      method: method || "Crypto",
      status: "pending", // Money is on hold
      referenceId: referenceId || `DEP-${Date.now()}`,
      description: `Deposit via ${method}`,
      proofImage: req.file.path,
    });

    res.status(200).json({
      success: true,
      message: "Deposit submitted. Awaiting admin approval.",
      transaction,
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
/**
 * @desc Withdraw funds (Checks for locked wallet and free balance)
 */
exports.withdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, method, payoutAddress } = req.body; // Added payout details
    const wallet = await Wallet.findOne({ user: req.user.id }).session(session);

    if (!wallet) throw new Error("Wallet not found");
    if (wallet.isLocked) throw new Error("Wallet is locked. Contact support.");
    if (wallet.freeBalance < amount)
      throw new Error("Insufficient free balance");

    // 1. Deduct from wallet immediately so they can't withdraw the same money twice
    wallet.totalBalance -= Number(amount);
    wallet.freeBalance -= Number(amount);
    await wallet.save({ session });

    // 2. Create Transaction as PENDING
    const transaction = await Transaction.create(
      {
        user: req.user.id,
        type: "withdrawal",
        amount: Number(amount),
        status: "pending", // Admin must approve to mark as completed
        method: method || "Bank Transfer",
        payoutAddress: payoutAddress, // Where the admin should send the money
        description: `Withdrawal request to ${method}`,
      },

      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Withdrawal request submitted for review",
      wallet,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};
