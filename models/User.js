const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    middleName: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true },
    currency: {
      type: String,
      trim: true,
      default: "USD",
      uppercase: true,
      required: true,
    },
    // Profile Details
    sex: { type: String, enum: ["male", "female", "other"] },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "divorced", "widowed"],
    },
    occupation: { type: String, trim: true },

    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String,
    },

    // Financial & State
    balance: { type: Number, default: 0 },
    tradingBalance: { type: Number, default: 0 },
    stakedAmount: { type: Number, default: 0 },
    totalProfits: { type: Number, default: 0 },
    accountType: {
      type: String,
      enum: ["basic", "standard", "silver", "gold", "demo"],
      default: "basic",
    },
    role: { type: String, enum: ["user", "admin"], default: "user" },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },

    copiedTraders: [
      {
        traderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Trader",
        },
        amountAllocated: {
          type: Number,
          default: 0,
        },
      },
    ],
    tradingBalance: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

// --- THE MODEL LOGIC (PRE-SAVE HOOK) ---
userSchema.pre("save", async function () {
  // Removed 'next' here
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) {
    return; // Just return, don't call next()
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    // No next() call needed here
  } catch (error) {
    // If using async, you can just throw the error
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
