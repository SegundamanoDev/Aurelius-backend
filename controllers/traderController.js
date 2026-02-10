const mongoose = require("mongoose");
const Trader = require("../models/Trader");
const User = require("../models/User");

// ===============================
// GET PUBLIC TRADERS
// ===============================
exports.getTraders = async (req, res) => {
  try {
    const traders = await Trader.find({ isPublic: true }).sort("-followers");
    res.json(traders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ===============================
// ADMIN: CREATE TRADER
// ===============================
exports.createTrader = async (req, res) => {
  try {
    const trader = await Trader.create(req.body);
    res.status(201).json(trader);
  } catch (error) {
    res.status(400).json({ message: "Failed to create trader" });
  }
};

// ===============================
// ADMIN: UPDATE TRADER
// ===============================
exports.updateTrader = async (req, res) => {
  try {
    const trader = await Trader.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(trader);
  } catch (error) {
    res.status(400).json({ message: "Update failed" });
  }
};

// ===============================
// ADMIN: DELETE TRADER
// ===============================
exports.deleteTrader = async (req, res) => {
  try {
    await Trader.findByIdAndDelete(req.params.id);
    res.json({ message: "Trader removed" });
  } catch (error) {
    res.status(400).json({ message: "Delete failed" });
  }
};

// ===============================
// START COPYING
// ===============================
exports.startCopying = async (req, res) => {
  const { traderId, amount } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(traderId)) {
      throw new Error("Invalid trader ID");
    }

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // 1. Balance check
    if (user.tradingBalance < amount) {
      throw new Error("Insufficient trading balance.");
    }

    // 2. Prevent duplicate mirroring
    const alreadyCopying = user.copiedTraders.some(
      (t) => t.traderId.toString() === traderId.toString(),
    );

    if (alreadyCopying) {
      throw new Error("You are already mirroring this strategist.");
    }

    // 3. Lock funds + attach trader
    user.copiedTraders.push({
      traderId,
      amountAllocated: amount,
    });

    user.tradingBalance -= amount;
    await user.save({ session });

    // 4. Increment followers safely
    await Trader.findByIdAndUpdate(
      traderId,
      { $inc: { followers: 1 } },
      { session },
    );

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: "Mirroring started successfully",
      tradingBalance: user.tradingBalance,
      copiedTraders: user.copiedTraders,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// ===============================
// STOP COPYING
// ===============================
exports.stopCopying = async (req, res) => {
  const { traderId } = req.body;
  const userId = req.user.id;

  if (!traderId) {
    return res.status(400).json({ message: "Trader ID is required" });
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // Find the specific index
    const copyIndex = user.copiedTraders.findIndex(
      (t) => t.traderId.toString() === traderId.toString(),
    );

    if (copyIndex === -1) {
      throw new Error("Target strategist not found in your active portfolio.");
    }

    // --- REFUND LOGIC REMOVED ---
    // The amountAllocated is not added back to user.tradingBalance

    // 1. Remove the trader from the user's active list
    user.copiedTraders.splice(copyIndex, 1);

    // 2. Save user state
    await user.save({ session });

    // 3. Update the trader's stats (decrement followers)
    await Trader.findByIdAndUpdate(
      traderId,
      { $inc: { followers: -1 } },
      { session },
    );

    await session.commitTransaction();

    res.status(200).json({
      message: "Connection terminated. Allocated funds remains deducted.",
      tradingBalance: user.tradingBalance,
      copiedTraders: user.copiedTraders,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
