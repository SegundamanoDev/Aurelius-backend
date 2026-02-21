const Transaction = require("../models/Transaction.js");
const User = require("../models/User.js");
const mongoose = require("mongoose");

// ==========================================
// 1. WALLET OPERATIONS (External Money)
// ==========================================

// Create Deposit (User starts here)
exports.depositFunds = async (req, res) => {
  try {
    // Multer puts text fields in req.body and the file in req.file
    const { amount, method, referenceId } = req.body;

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ message: "No proof of payment uploaded" });
    }

    const transaction = await Transaction.create({
      userId: req.user._id,
      type: "deposit",
      amount: Number(amount), // FORCE CONVERSION TO NUMBER
      method,
      referenceId,
      status: "pending",
      description: `Deposit via ${method}`,
      proofImage: req.file.path, // Cloudinary URL
    });

    res.status(201).json(transaction);
  } catch (error) {
    console.error("Deposit Controller Error:", error);
    res.status(400).json({ message: error.message });
  }
};

// Request Withdrawal (User)
exports.requestWithdrawal = async (req, res) => {
  const { amount, method, payoutAddress } = req.body; // Added payoutAddress
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);

    if (user.balance < amount) {
      throw new Error("Insufficient balance");
    }

    const referenceId = `WD-${Math.random().toString(36).toUpperCase().slice(2, 10)}`;

    const [transaction] = await Transaction.create(
      [
        {
          userId: req.user._id,
          type: "withdrawal",
          amount: Number(amount),
          method,
          referenceId,
          status: "pending",
          description: `Withdrawal request to ${payoutAddress}`,
        },
      ],
      { session },
    );

    // Lock the funds immediately so they can't spend it elsewhere
    user.balance -= amount;
    await user.save({ session });

    await session.commitTransaction();

    // Return the transaction object so the frontend can use the referenceId in EmailJS
    res.status(201).json(transaction);
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ==========================================
// 2. SERVICE & TRADING OPERATIONS (Internal)
// ==========================================

exports.purchaseService = async (req, res) => {
  const { amount, planName, signalType, description } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    if (!user) throw new Error("User not found");

    if (user.balance < amount) {
      throw new Error("Insufficient liquidity for this purchase.");
    }

    // Deduct balance
    user.balance -= amount;
    await user.save({ session });

    // Create transaction
    const [transaction] = await Transaction.create(
      [
        {
          userId,
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
      message: "Purchase successful",
      newBalance: user.balance,
      transaction,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// Universal Purchase Handler (Upgrade, Signal, Stake, Fund Trading)
// transactionController.js

exports.handleServicePurchase = async (req, res) => {
  const { type, amount, details, description } = req.body;
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(req.user._id).session(session);
    if (user.balance < amount)
      throw new Error("Insufficient main wallet balance");

    // --- PUT THE SWITCH BLOCK HERE ---
    switch (type) {
      case "account_upgrade":
        user.accountType = details.planName;
        break;
      case "trading_fund":
        // Moves money from main balance to trading pool
        user.tradingBalance = (user.tradingBalance || 0) + amount;
        break;
      case "trading_sell":
        // Checks if user has enough in trading to move back to main balance
        if (user.tradingBalance < amount)
          throw new Error("Insufficient trading capital");
        user.tradingBalance -= amount;
        user.balance += amount;
        break;
    }

    // Deduct the cost from main balance (common for all types)
    if (type !== "trading_sell") {
      user.balance -= amount;
    }

    // 1. Create the Transaction record
    await Transaction.create(
      [
        {
          userId: req.user._id,
          type,
          amount,
          details,
          description,
          status: "completed",
        },
      ],
      { session },
    );

    // 2. Save User changes
    await user.save({ session });

    await session.commitTransaction();
    res.status(201).json({ message: "Operation successful" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};

// ==========================================
// 3. HISTORY & STATS (User View)
// ==========================================

exports.getMyTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ userId: req.user._id }).sort(
      "-createdAt",
    );
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: "Error fetching history" });
  }
};

// ==========================================
// 4. ADMIN OPERATIONS
// ==========================================

exports.getAllTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find()
      .populate("userId", "firstName lastName email")
      .sort("-createdAt");
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// transactionController.js

exports.updateTransactionStatus = async (req, res) => {
  const { transactionId, status } = req.body;

  try {
    const transaction = await Transaction.findById(transactionId);
    if (!transaction) return res.status(404).json({ message: "Not found" });

    // --- PUT THE STATUS CHECK HERE ---
    // This stops the function if the transaction is already "done"
    if (transaction.status === "completed" || transaction.status === "failed") {
      return res.status(400).json({ message: "Transaction already processed" });
    }

    // ... continue with processing the status update (deposit logic, etc.)
    if (transaction.type === "deposit" && status === "completed") {
      await User.findByIdAndUpdate(transaction.userId, {
        $inc: { balance: transaction.amount },
      });
    }

    transaction.status = status;
    await transaction.save();
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// backend/controllers/adminController.js

exports.injectLedgerEntry = async (req, res) => {
  const { userId, amount, method, date, type } = req.body;

  try {
    // 1. Create the historical transaction
    const transaction = await Transaction.create({
      userId,
      type: type || "deposit",
      amount: Number(amount),
      status: "completed",
      description: type === "profit" ? `+${amount} Profit` : ``,
      createdAt: new Date(date),
    });

    // 2. Update User Balances
    const updateData = { $inc: { balance: Number(amount) } };

    // If it's a profit, also increment the profit tracking field
    if (type === "profit" || type === "trading_yield") {
      updateData.$inc.totalProfits = Number(amount);
    }

    await User.findByIdAndUpdate(userId, updateData);
    console.log(transaction);

    res.status(201).json(transaction);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
// transactionController.js

exports.topupUserProfit = async (req, res) => {
  const { userId, amount, description } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // 1. Update User: Increase both liquid balance and cumulative profit record
    user.balance += Number(amount);
    user.totalProfits = (user.totalProfits || 0) + Number(amount);
    await user.save({ session });

    const transaction = await Transaction.create(
      [
        {
          userId,
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
