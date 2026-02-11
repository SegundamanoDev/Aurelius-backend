const mongoose = require("mongoose");
const traderSchema = new mongoose.Schema(
  {
    name: String,
    username: String,
    avatar: String,
    bio: String,
    verified: { type: Boolean, default: false },
    experienceYears: Number,
    location: String,

    performance: {
      roi30d: Number,
      roi90d: Number,
      roi1y: Number,
      totalRoi: Number,
      monthlyAverage: Number,
      totalProfit: Number,
      assetsUnderManagement: Number,
      winRate: Number,
      totalTrades: Number,
      winningTrades: Number,
      losingTrades: Number,
      avgWin: Number,
      avgLoss: Number,
      profitFactor: Number,
    },

    riskMetrics: {
      riskScore: Number,
      maxDrawdown: Number,
      sharpeRatio: Number,
      averageTradeDuration: String,
      maxConsecutiveLosses: Number,
      leverageUsed: String,
    },

    strategy: {
      style: String,
      markets: [String],
      preferredAssets: [String],
      timeframe: String,
      riskLevel: String,
    },

    social: {
      followers: { type: Number, default: 0 },
      copiers: { type: Number, default: 0 },
      rating: Number,
      reviewsCount: Number,
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

const Trader = mongoose.model("Trader", traderSchema);
module.exports = Trader;
