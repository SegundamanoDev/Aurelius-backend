const mongoose = require("mongoose");
const performanceFeeSchema = new mongoose.Schema(
  {
    trader: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Trader",
      required: true,
    },
    copier: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: { type: Number, required: true },
    isPaid: { type: Boolean, default: false },
  },
  { timestamps: true },
);

const PerformanceFee = mongoose.model("PerformanceFee", performanceFeeSchema);

module.exports = { Transaction, PerformanceFee };
