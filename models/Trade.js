const mongoose = require("mongoose");

const tradeSchema = new mongoose.Schema(
  {
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },
    asset: { type: String, required: true },
    type: { type: String, enum: ["long", "short"], required: true },
    entryPrice: { type: Number, required: true },
    closePrice: Number,
    status: { type: String, enum: ["open", "closed"], default: "open" },
    pnl: { type: Number, default: 0 },
    leverage: { type: Number, default: 1 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Trade", tradeSchema);
