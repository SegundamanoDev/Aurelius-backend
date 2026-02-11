const mongoose = require("mongoose");
const Trader = require("../models/Trader");
const User = require("../models/User");

// ===============================
// START COPYING TRADER
// ===============================
exports.startCopying = async (req, res) => {
  const { traderId } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    if (!mongoose.Types.ObjectId.isValid(traderId)) {
      throw new Error("Invalid trader ID");
    }

    const trader = await Trader.findById(traderId).session(session);
    if (!trader) throw new Error("Trader not found");

    const user = await User.findById(userId).session(session);
    if (!user) throw new Error("User not found");

    // ✅ Prevent duplicate copying
    const alreadyCopying = user.copiedTraders.some(
      (t) => t.traderId.toString() === traderId.toString(),
    );

    if (alreadyCopying) {
      throw new Error("You are already copying this trader");
    }

    // ✅ Add trader to copiedTraders array
    user.copiedTraders.push({
      traderId,
    });

    await user.save({ session });

    // ✅ Increase trader followers
    trader.social.followers += 1;
    await trader.save({ session });

    await session.commitTransaction();
    session.endSession();

    // Return updated user profile
    const updatedUser = await User.findById(userId).populate(
      "copiedTraders.traderId",
    );

    res.status(200).json({
      message: "Copy trading started successfully",
      user: updatedUser,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();

    res.status(400).json({
      message: error.message,
    });
  }
};

// CREATE
exports.createTrader = async (req, res) => {
  try {
    const trader = await Trader.create(req.body);

    res.status(201).json({
      message: "Trader created successfully",
      trader,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.getTraders = async (req, res) => {
  try {
    const traders = await Trader.find({ isActive: true });

    res.status(200).json(traders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.getTraderById = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);

    if (!trader) {
      return res.status(404).json({ message: "Trader not found" });
    }

    res.status(200).json(trader);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
exports.updateTrader = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);

    if (!trader) {
      return res.status(404).json({ message: "Trader not found" });
    }

    const updatedTrader = await Trader.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      message: "Trader updated successfully",
      trader: updatedTrader,
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
exports.deleteTrader = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);

    if (!trader) {
      return res.status(404).json({ message: "Trader not found" });
    }

    trader.isActive = false;
    await trader.save();

    res.status(200).json({
      message: "Trader deactivated successfully",
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
