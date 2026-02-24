const mongoose = require("mongoose");

const copierTradeSchema = new mongoose.Schema(
  {
    masterTrade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trade",
      required: true,
    },
    copier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },
    allocationRatio: { type: Number, required: true },
    entryPrice: Number,
    slippage: { type: Number, default: 0 },
    status: { type: String, enum: ["open", "closed"], default: "open" },
    pnl: { type: Number, default: 0 },
    marginUsed: { type: Number, required: true },
  },
  { timestamps: true },
);

module.exports = mongoose.model("CopierTrade", copierTradeSchema);
