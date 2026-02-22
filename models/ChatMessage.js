const mongoose = require("mongoose");
const chatMessageSchema = new mongoose.Schema({
  room: { type: String, required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  text: { type: String, required: true },
  isAdmin: { type: Boolean, default: false },
  status: { type: String, enum: ["sent", "delivered"], default: "sent" }, // Added
  timestamp: { type: Date, default: Date.now }, // This tracks the time
});

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
