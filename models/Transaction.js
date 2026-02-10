const mongoose = require("mongoose");
const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // Detailed types for precise tracking
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal", // Basic Wallet
        "account_upgrade", // Plan Upgrades
        "trading_fund",
        "trading_yield", // Trading Activity
        "signal_purchase", // One-time service
        "staking_deposit",
        "staking_reward", // Passive Income
      ],
      required: true,
    },

    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },

    // Tracking metadata
    details: {
      planName: String, // e.g., "Gold Plan"
      signalType: String, // e.g., "Crypto-Daily"
      stakingDuration: Number, // In days
    },

    referenceId: String, // Payment provider ID
    description: String,
  },
  { timestamps: true },
);

const Transaction = mongoose.model("Transaction", transactionSchema);
module.exports = Transaction;
