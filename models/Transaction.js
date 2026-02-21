const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    type: {
      type: String,
      enum: [
        "deposit",
        "purchase",
        "withdrawal",
        "account_upgrade",
        "trading_fund",
        "trading_yield",
        "profit",
      ],
      required: true,
    },
    proofImage: { type: String },
    amount: { type: Number, required: true },

    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    method: { type: String },
    details: {
      planName: String,
      signalType: String,
      stakingDuration: Number,
    },

    referenceId: String,
    description: String,
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
