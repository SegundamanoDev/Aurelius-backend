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
    frozenBalance: { type: Number, default: 0 },
    totalDeposits: { type: Number, default: 0 },
    totalWithdrawals: { type: Number, default: 0 },
    totalProfits: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    currency: { type: String, default: "USD", uppercase: true },
    isLocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

walletSchema.pre("save", function () {
  this.totalBalance =
    (this.freeBalance || 0) +
    (this.allocatedBalance || 0) +
    (this.frozenBalance || 0);
});
module.exports = mongoose.model("Wallet", walletSchema);
