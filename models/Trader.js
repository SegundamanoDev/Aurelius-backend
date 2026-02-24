const mongoose = require("mongoose");

const traderSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    username: { type: String, required: true, unique: true },
    profileImage: String,
    bio: String,
    verified: { type: Boolean, default: false },

    // Performance Metrics
    totalROI: { type: Number, default: 0 },
    monthlyROI: [{ month: String, roi: Number }],
    winRate: { type: Number, default: 0 },
    maxDrawdown: { type: Number, default: 0 },
    riskScore: { type: Number, min: 1, max: 10, default: 5 },

    // Pro Stats
    equity: { type: Number, default: 0 }, // Trader's own balance
    totalTrades: { type: Number, default: 0 },
    avgTradeDuration: Number, // in minutes
    tradingStyle: { type: String, enum: ["Scalping", "Day Trading", "Swing"] },

    // Copier Info
    followersCount: { type: Number, default: 0 },
    totalCopiedCapital: { type: Number, default: 0 },
    minCopyAmount: { type: Number, default: 100 },
    performanceFeePercent: { type: Number, default: 20 },

    isActive: { type: Boolean, default: true },
    lastTradeAt: Date,
    assetAllocation: [{ name: String, value: Number }],
    recentHistory: [{ closedAt: Date, pnl: Number }],
  },
  { timestamps: true },
);

module.exports = mongoose.model("Trader", traderSchema);
