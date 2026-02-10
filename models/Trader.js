const mongoose = require("mongoose");

const traderSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    avatar: { type: String, required: true }, // e.g., "AK" or a URL
    strategy: { type: String, default: "Institutional" }, // e.g., "Scalping"

    // Performance Metrics (Strings to match your UI +124.5%)
    roi: { type: String, required: true },
    winRate: { type: String, required: true },

    // Stats for the Discovery Grid
    followers: { type: Number, default: 0 },
    maxDrawdown: { type: String, default: "-0.0%" },

    // Admin Control
    isPublic: { type: Boolean, default: true },
    isTrending: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const Trader = mongoose.model("Trader", traderSchema);
module.exports = Trader;
