const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    type: {
      type: String,
      enum: ["deposit", "withdrawal", "transfer", "profit", "loss", "copy_fee"],
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    method: { type: String }, // e.g., "BTC", "ETH", "USDT"
    referenceId: { type: String, unique: true },
    description: { type: String },
    proofImage: { type: String }, // This stores the Cloudinary URL
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
