const mongoose = require("mongoose");

const copyRelationshipSchema = new mongoose.Schema(
  {
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
    allocatedAmount: { type: Number, required: true },
    remainingAllocation: { type: Number, required: true },
    stopCopyLossPercent: { type: Number, default: 20 },
    maxDrawdownFixed: { type: Number },
    status: {
      type: String,
      enum: ["active", "paused", "stopped"],
      default: "active",
    },
  },
  { timestamps: true },
);

// Indexing for faster lookups when a trader opens a trade
copyRelationshipSchema.index({ trader: 1, status: 1 });

module.exports = mongoose.model("CopyRelationship", copyRelationshipSchema);
