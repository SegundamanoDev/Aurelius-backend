const mongoose = require("mongoose");

const walletSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    totalBalance: { type: Number, default: 0 },
    freeBalance: { type: Number, default: 0 },
    allocatedBalance: { type: Number, default: 0 },
    marginUsed: { type: Number, default: 0 },
    currency: { type: String, default: "USD", uppercase: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Wallet", walletSchema);
