const mongoose = require("mongoose");
const CopyRelationship = require("../models/CopyRelationship");
const Wallet = require("../models/Wallet");
const Trader = require("../models/Trader");
const CopierTrade = require("../models/CopierTrade");

/**
 * @desc Start copying a trader with ACID protection
 */
exports.startCopy = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { traderId, allocationAmount, stopCopyLossPercent } = req.body;

    const trader = await Trader.findById(traderId).session(session);
    if (!trader || !trader.isActive) throw new Error("Trader not available");
    if (allocationAmount < trader.minCopyAmount)
      throw new Error(`Minimum copy amount is $${trader.minCopyAmount}`);

    const wallet = await Wallet.findOne({ user: req.user._id }).session(
      session,
    );
    if (wallet.freeBalance < allocationAmount)
      throw new Error("Insufficient free balance");

    // 1. Check for existing active relationship
    const existing = await CopyRelationship.findOne({
      copier: req.user._id,
      trader: traderId,
      status: "active",
    }).session(session);
    if (existing) throw new Error("You are already copying this trader");

    // 2. Move funds to "Escrow" (Allocated Balance)
    wallet.freeBalance -= Number(allocationAmount);
    wallet.allocatedBalance += Number(allocationAmount);
    await wallet.save({ session });

    // 3. Create Relationship
    const copyRelationship = await CopyRelationship.create(
      [
        {
          copier: req.user._id,
          trader: traderId,
          allocatedAmount: allocationAmount,
          remainingAllocation: allocationAmount, // Initial state
          stopCopyLossPercent: stopCopyLossPercent || 20,
        },
      ],
      { session },
    );

    // 4. Update Trader Stats
    trader.followersCount += 1;
    trader.totalCopiedCapital += Number(allocationAmount);
    await trader.save({ session });

    await session.commitTransaction();
    res.status(201).json({ success: true, data: copyRelationship[0] });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};

/**
 * @desc Stop copying (Safety First: check for open trades)
 */
exports.stopCopy = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const copy = await CopyRelationship.findById(req.params.id).session(
      session,
    );
    if (!copy || copy.copier.toString() !== req.user._id)
      throw new Error("Relationship not found");

    // CRITICAL: Check if there are still open trades for this relationship
    const openTradesCount = await CopierTrade.countDocuments({
      copier: req.user._id,
      trader: copy.trader,
      status: "open",
    }).session(session);

    if (openTradesCount > 0) {
      throw new Error(
        "Cannot stop copying while trades are still open. Close trades first.",
      );
    }

    const wallet = await Wallet.findOne({ user: req.user._id }).session(
      session,
    );
    const trader = await Trader.findById(copy.trader).session(session);

    // Release funds
    wallet.freeBalance += copy.remainingAllocation;
    wallet.allocatedBalance -= copy.remainingAllocation;
    await wallet.save({ session });

    copy.status = "stopped";
    copy.stoppedAt = new Date();
    await copy.save({ session });

    trader.followersCount -= 1;
    trader.totalCopiedCapital -= copy.allocatedAmount;
    await trader.save({ session });

    await session.commitTransaction();
    res
      .status(200)
      .json({ success: true, message: "Copy stopped and funds released" });
  } catch (error) {
    await session.abortTransaction();
    res.status(400).json({ success: false, message: error.message });
  } finally {
    session.endSession();
  }
};
/**
 * @desc Get all active copies for the logged-in user
 */
exports.getMyCopies = async (req, res) => {
  try {
    const copies = await CopyRelationship.find({
      copier: req.user._id,
      status: "active",
    })
      .populate("trader", "username profileImage tradingStyle") // Get specific trader fields
      .sort("-createdAt");

    res.status(200).json({
      success: true,
      count: copies.length,
      data: copies,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching your copies",
      error: error.message,
    });
  }
};
