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
  const { transactionId, status } = req.body;

  // 1. Validation
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
    // 2. Fetch Data
    const transaction =
      await Transaction.findById(transactionId).session(session);
    if (!transaction) throw new Error("Transaction record not found.");
    if (transaction.status !== "pending") {
      throw new Error(`Conflict: Transaction is already ${transaction.status}`);
    }

    const targetUserId = transaction.user || transaction.userId;
    const wallet = await Wallet.findOne({ user: targetUserId }).session(
      session,
    );
    if (!wallet) throw new Error("Critical: User wallet not found.");

    const amount = Number(transaction.amount);

    // Store original balance for the audit log
    transaction.previousBalance = wallet.freeBalance;

    // 3. Merged Logic Branching
    if (transaction.type === "deposit") {
      if (status === "completed") {
        wallet.freeBalance += amount;
        wallet.totalDeposits = (wallet.totalDeposits || 0) + amount;
        // wallet.totalBalance updates via Schema .pre('save')
      }
    } else if (transaction.type === "withdrawal") {
      if (status === "completed") {
        // Remove from frozen (it was moved there during withdrawal request)
        wallet.frozenBalance = Math.max(
          0,
          (wallet.frozenBalance || 0) - amount,
        );
        wallet.totalWithdrawals = (wallet.totalWithdrawals || 0) + amount;
      } else if (status === "failed") {
        // Return money from frozen back to freeBalance
        wallet.frozenBalance = Math.max(
          0,
          (wallet.frozenBalance || 0) - amount,
        );
        wallet.freeBalance += amount;
      }
    } else if (transaction.type === "profit") {
      if (status === "completed") {
        wallet.freeBalance += amount;
        wallet.totalProfits = (wallet.totalProfits || 0) + amount;
      }
    }

    // 4. Update Transaction Audit Trail
    transaction.status = status;
    transaction.newBalance = wallet.freeBalance;

    // 5. Commit Changes
    await transaction.save({ session });
    await wallet.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      success: true,
      message: `Transaction ${transaction.type} successfully marked as ${status}.`,
      data: {
        transaction,
        updatedBalances: {
          totalBalance: wallet.totalBalance,
          freeBalance: wallet.freeBalance,
          frozenBalance: wallet.frozenBalance,
          totalDeposits: wallet.totalDeposits,
          totalWithdrawals: wallet.totalWithdrawals,
          totalProfits: wallet.totalProfits,
        },
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Transaction Update Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.injectLedgerEntry = async (req, res) => {
  const { userId, amount, method, date, type } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const numAmount = Math.abs(Number(amount));

    const descriptions = {
      deposit: "Institutional Capital Funding",
      profit: "Quarterly Performance Dividend",
      withdrawal: "Account Liquidation / Capital Return",
      referral: "Affiliate Commission Settlement",
    };

    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          type: type || "deposit",
          amount: numAmount,
          status: "completed",
          method: method || "Bank Wire",
          createdAt: date ? new Date(date) : new Date(),
          description: descriptions[type] || "Ledger Reconciliation Entry",
        },
      ],
      { session },
    );
    console.log(transaction);

    const isNegative = type === "withdrawal";
    const mathAmount = isNegative ? -numAmount : numAmount;

    const walletUpdate = {
      $inc: {
        totalBalance: mathAmount,
        freeBalance: mathAmount,
      },
    };

    if (type === "profit") {
      walletUpdate.$inc.totalProfits = numAmount;
    } else if (type === "deposit") {
      walletUpdate.$inc.totalDeposits = numAmount;
    } else if (type === "withdrawal") {
      walletUpdate.$inc.totalWithdrawals = numAmount;
    }

    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId },
      walletUpdate,
      { session, new: true, runValidators: true },
    );

    if (!updatedWallet) throw new Error("Target Vault not found");

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      transaction,
      newBalances: updatedWallet,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ success: false, message: error.message });
  }
};

exports.topupUserProfit = async (req, res) => {
  const { userId, amount, description } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const numAmount = Number(amount);
    const updatedWallet = await Wallet.findOneAndUpdate(
      { user: userId },
      {
        $inc: {
          freeBalance: numAmount,
          totalBalance: numAmount,
          totalProfits: numAmount,
        },
      },
      { session, new: true, runValidators: true },
    );

    if (!updatedWallet) throw new Error("User wallet not found");
    const [transaction] = await Transaction.create(
      [
        {
          user: userId,
          type: "profit",
          amount: numAmount,
          status: "completed",
          description: description || "System Profit Allocation",
          previousBalance: updatedWallet.freeBalance - numAmount,
          newBalance: updatedWallet.freeBalance,
        },
      ],
      { session },
    );

    // 3. Finalize Database Session
    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Profit successfully injected and logged",
      transaction,
      balances: {
        currentBalance: updatedWallet.totalBalance,
        lifetimeProfits: updatedWallet.totalProfits,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Profit Injection Error:", error.message);
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
