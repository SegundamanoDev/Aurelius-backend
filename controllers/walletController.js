const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");
const Transaction = require("../models/Transaction");

/**
 * @desc Get user wallet
 */
exports.getWallet = async (req, res) => {
  try {
    const wallet = await Wallet.findOne({ user: req.user._id });
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

exports.withdraw = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { amount, method, payoutAddress } = req.body;
    const wallet = await Wallet.findOne({ user: req.user._id }).session(
      session,
    );

    if (wallet.freeBalance < amount)
      throw new Error("Insufficient free balance");

    // 1. Move funds to frozen
    wallet.freeBalance -= Number(amount);
    wallet.frozenBalance += Number(amount);
    await wallet.save({ session });

    // 2. Create Transaction with a Generated Reference
    const refId = `WTH-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    await Transaction.create(
      [
        {
          user: req.user._id,
          type: "withdrawal",
          amount: Number(amount),
          status: "pending",
          method: method || "Crypto",
          payoutAddress,
          referenceId: refId,
          description: `Withdrawal request to ${payoutAddress}`,
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res
      .status(200)
      .json({ success: true, message: "Withdrawal pending admin review" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
