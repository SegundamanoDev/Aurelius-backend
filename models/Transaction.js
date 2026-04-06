const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: [
        "deposit",
        "withdrawal",
        "transfer",
        "profit",
        "loss",
        "copy_fee",
        "refund",
      ],
      required: true,
    },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pending", "completed", "failed", "cancelled"],
      default: "pending",
    },
    previousBalance: { type: Number },
    newBalance: { type: Number },
    method: { type: String },
    referenceId: { type: String, unique: true, sparse: true, trim: true },
    description: { type: String },
    proofImage: { type: String },
    adminNote: { type: String },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Transaction", transactionSchema);
