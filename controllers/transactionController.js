const Transaction = require("../models/Transaction.js");
const User = require("../models/User.js");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet");

// ==========================================
// 1. PURCHASE LOGIC (Services/Signals)
// ==========================================
exports.purchaseService = async (req, res) => {
  const { amount, planName, signalType, description } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Find the WALLET instead of the User
    const wallet = await Wallet.findOne({ user: userId }).session(session);
    if (!wallet) throw new Error("Wallet not found for this user.");

    // 2. Check Liquidity in Wallet
    if (wallet.freeBalance < amount) {
      throw new Error("Insufficient liquidity for this purchase.");
    }

    // 3. Deduct from Wallet
    wallet.freeBalance -= Number(amount);
    wallet.totalBalance -= Number(amount);
    await wallet.save({ session });

    // 4. Create Transaction record
    const [transaction] = await Transaction.create(
      [
        {
          user: userId, // Fixed field name
          type: "purchase",
          amount,
          status: "completed",
          description,
          details: {
            planName,
            signalType,
          },
        },
      ],
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: "Purchase successful",
      newBalance: wallet.freeBalance,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

// ==========================================
// 2. HISTORY & STATS
// ==========================================
exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user._id }).sort(
      "-createdAt",
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("user", "firstName lastName email currency")
      .sort("-createdAt");
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ==========================================
// 3. ADMIN OPERATIONS (Approval & Injections)
// ==========================================

exports.updateTransactionStatus = async (req, res) => {
  const { transactionId, status } = req.body; // status: 'completed' | 'failed'

  // 1. Validate Input Status
  const allowedStatuses = ["completed", "failed"];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid status. Use 'completed' or 'failed'.",
    });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 2. Fetch Transaction with Session
    const transaction =
      await Transaction.findById(transactionId).session(session);
    if (!transaction) throw new Error("Transaction record not found.");

    // 3. Prevent Double Processing
    if (transaction.status !== "pending") {
      throw new Error(`Conflict: Transaction is already ${transaction.status}`);
    }

    // 4. Identify User and Wallet
    const targetUserId = transaction.user || transaction.userId;
    if (!targetUserId)
      throw new Error("Corrupted Data: No User ID linked to transaction.");

    const wallet = await Wallet.findOne({ user: targetUserId }).session(
      session,
    );
    if (!wallet)
      throw new Error(`Critical: Wallet not found for user ${targetUserId}`);

    // 5. Logic Engine
    const amount = Number(transaction.amount);

    if (transaction.type === "deposit") {
      if (status === "completed") {
        // Only credit on approval
        wallet.totalBalance += amount;
        wallet.freeBalance += amount;
      }
      // If failed, we do nothing to wallet; user just doesn't get the money.
    } else if (transaction.type === "withdrawal") {
      if (status === "failed") {
        // REFUND: Put money back because the request was rejected/failed
        wallet.totalBalance += amount;
        wallet.freeBalance += amount;
      }
      // If completed, we do nothing; money was already deducted at request.
    }

    // 6. Persist Changes
    transaction.status = status;

    // We save both within the session to ensure atomicity
    await transaction.save({ session });
    await wallet.save({ session });

    // 7. Commit and Finish
    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Transaction ${transaction.type} marked as ${status}.`,
      data: {
        transaction,
        newBalance: wallet.freeBalance,
      },
    });
  } catch (error) {
    // Rollback all changes if any step fails
    await session.abortTransaction();
    session.endSession();

    console.error("Transaction Update Error:", error.message);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};

exports.injectLedgerEntry = async (req, res) => {
  const { userId, amount, method, date, type } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const transaction = await Transaction.create(
      [
        {
          user: userId, // Updated from userId
          type: type || "deposit",
          amount: Number(amount),
          status: "completed",
          method: method || "System Ledger",
          createdAt: new Date(date),
        },
      ],
      { session },
    );

    const mathAmount =
      type === "withdrawal" ? -Math.abs(amount) : Math.abs(amount);

    const walletUpdate = {
      $inc: {
        totalBalance: mathAmount,
        freeBalance: mathAmount,
      },
    };

    if (type === "profit") {
      walletUpdate.$inc.totalProfits = Math.abs(amount);
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId },
      walletUpdate,
      { session, new: true },
    );

    if (!updatedWallet) throw new Error("User wallet not found");

    await session.commitTransaction();
    session.endSession();

    res.status(201).json(transaction[0]);
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

exports.topupUserProfit = async (req, res) => {
  const { userId, amount, description } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Update Wallet instead of User balance
    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          freeBalance: Number(amount),
          totalBalance: Number(amount),
          totalProfits: Number(amount), // Ensure your Wallet schema has this field
        },
      },
      { session, new: true },
    );

    if (!updatedWallet) throw new Error("Wallet not found");

    const transaction = await Transaction.create(
      [
        {
          user: userId, // Updated from userId
          type: "profit",
          amount,
          status: "completed",
          description: description || "System Profit Allocation",
        },
      ],
      { session },
    );

    await session.commitTransaction();
    res.status(201).json({
      message: "Profit successfully injected",
      transaction: transaction[0],
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
