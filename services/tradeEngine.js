const mongoose = require("mongoose");
const CopyRelationship = require("../models/CopyRelationship");
const CopierTrade = require("../models/CopierTrade");
const Wallet = require("../models/Wallet");
const PerformanceFee = require("../models/PerformanceFee");
const Trader = require("../models/Trader");

/**
 * Handle mirroring a trade to all copiers (Optimized for speed)
 */
exports.handleTraderOpenTrade = async (masterTrade) => {
  try {
    const activeCopies = await CopyRelationship.find({
      trader: masterTrade.trader,
      status: "active",
    });

    const trader = await Trader.findById(masterTrade.trader);
    // Use Trader's own equity to calculate the true ratio
    const traderEquity = trader.equity || 10000;

    // Process all copiers in parallel
    await Promise.all(
      activeCopies.map(async (copy) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const ratio = copy.allocatedAmount / traderEquity;
          const copierMargin = masterTrade.marginUsed * ratio;

          // Safety check: Don't open if copier has no remaining budget
          if (copy.remainingAllocation < copierMargin) return;

          // 1. Update Wallet & Relationship
          await Wallet.findOneAndUpdate(
            { user: copy.copier },
            {
              $inc: {
                marginUsed: copierMargin,
                allocatedBalance: -copierMargin,
              },
            },
            { session },
          );

          await CopyRelationship.findByIdAndUpdate(
            copy._id,
            { $inc: { remainingAllocation: -copierMargin } },
            { session },
          );

          // 2. Create the Shadow Trade
          await CopierTrade.create(
            [
              {
                masterTrade: masterTrade._id,
                copier: copy.copier,
                trader: masterTrade.trader,
                allocationRatio: ratio,
                asset: masterTrade.asset,
                type: masterTrade.type,
                entryPrice: masterTrade.entryPrice,
                marginUsed: copierMargin,
                status: "open",
              },
            ],
            { session },
          );

          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
          console.error(`Copy failed for user ${copy.copier}:`, err.message);
        } finally {
          session.endSession();
        }
      }),
    );
  } catch (error) {
    console.error("Critical Engine Error (Open):", error);
  }
};

/**
 * Handle closing and PnL distribution
 */
exports.handleTraderCloseTrade = async (masterTrade) => {
  try {
    const copierTrades = await CopierTrade.find({
      masterTrade: masterTrade._id,
      status: "open",
    });

    await Promise.all(
      copierTrades.map(async (cTrade) => {
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
          const pnl = masterTrade.pnl * cTrade.allocationRatio;
          let finalReturn = cTrade.marginUsed + pnl;
          let perfFee = 0;

          // 1. Performance Fee Calculation (20%)
          if (pnl > 0) {
            perfFee = pnl * 0.2;
            finalReturn -= perfFee;

            await PerformanceFee.create(
              [
                {
                  trader: cTrade.trader,
                  copier: cTrade.copier,
                  trade: masterTrade._id,
                  amount: perfFee,
                  isPaid: true,
                },
              ],
              { session },
            );
          }

          // 2. Settlement
          await Wallet.findOneAndUpdate(
            { user: cTrade.copier },
            {
              $inc: {
                marginUsed: -cTrade.marginUsed,
                freeBalance: finalReturn,
                totalBalance: pnl - perfFee,
              },
            },
            { session },
          );

          // 3. Update Relationship remaining capacity
          await CopyRelationship.findOneAndUpdate(
            { copier: cTrade.copier, trader: cTrade.trader, status: "active" },
            {
              $inc: { remainingAllocation: cTrade.marginUsed, currentPnL: pnl },
            },
            { session },
          );

          await cTrade.updateOne(
            {
              status: "closed",
              pnl: pnl,
              closePrice: masterTrade.closePrice,
              closedAt: new Date(),
            },
            { session },
          );

          await session.commitTransaction();
        } catch (err) {
          await session.abortTransaction();
        } finally {
          session.endSession();
        }
      }),
    );
  } catch (error) {
    console.error("Critical Engine Error (Close):", error);
  }
};
