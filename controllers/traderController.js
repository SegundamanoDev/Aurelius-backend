const Trader = require("../models/Trader.js");

// @desc    Admin: Create a new Master Trader
exports.createTrader = async (req, res) => {
  try {
    const trader = await Trader.create(req.body);
    res.status(201).json(trader);
  } catch (error) {
    res.status(400).json({ message: "Failed to create trader" });
  }
};

// @desc    User: Get all traders for the Discovery Grid
exports.getTraders = async (req, res) => {
  try {
    const traders = await Trader.find({ isPublic: true }).sort("-followers");
    res.json(traders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Admin: Update trader stats (ROI/Followers)
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

// @desc    Admin: Delete a trader
exports.deleteTrader = async (req, res) => {
  try {
    await Trader.findByIdAndDelete(req.params.id);
    res.json({ message: "Trader removed from terminal" });
  } catch (error) {
    res.status(400).json({ message: "Delete failed" });
  }
};

exports.startCopying = async (req, res) => {
  const { traderId, amount } = req.body;
  const userId = req.user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    // 1. Validation: Check if user has enough in Trading Balance
    if (user.tradingBalance < amount) {
      throw new Error(
        "Insufficient trading balance. Please fund your trading account.",
      );
    }

    // 2. Check if already copying to prevent duplicates
    const alreadyCopying = user.copiedTraders.some(
      (t) => t.traderId.toString() === traderId,
    );
    if (alreadyCopying) {
      throw new Error("You are already mirroring this strategist.");
    }

    // 3. Update User: Add trader and lock the allocated amount
    user.copiedTraders.push({ traderId, amountAllocated: amount });
    user.tradingBalance -= amount; // Deduct from available trading funds
    await user.save({ session });

    // 4. Update Trader: Increment follower count automatically
    await Trader.findByIdAndUpdate(
      traderId,
      { $inc: { followers: 1 } },
      { session },
    );

    await session.commitTransaction();
    res.status(200).json({
      message: "Mirroring started successfully",
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

exports.stopCopying = async (req, res) => {
  const { traderId } = req.body;
  const userId = req.user.id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const user = await User.findById(userId).session(session);

    // 1. Find the copy data to get the refund amount
    const copyData = user.copiedTraders.find(
      (t) => t.traderId.toString() === traderId,
    );
    if (!copyData) throw new Error("Strategist not found in your terminal.");

    // 2. Refund the amount back to Trading Balance
    user.tradingBalance += copyData.amountAllocated;

    // 3. Remove from user's list
    user.copiedTraders = user.copiedTraders.filter(
      (t) => t.traderId.toString() !== traderId,
    );
    await user.save({ session });

    // 4. Decrement Trader follower count
    await Trader.findByIdAndUpdate(
      traderId,
      { $inc: { followers: -1 } },
      { session },
    );

    await session.commitTransaction();
    res.status(200).json({
      message: "Position closed. Funds returned to trading balance.",
      tradingBalance: user.tradingBalance,
    });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ message: error.message });
  } finally {
    session.endSession();
  }
};
