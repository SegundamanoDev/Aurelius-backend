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
    role: { type: String, enum: ["user", "trader", "admin"], default: "user" },

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

    // --- NEW: FINANCIAL PROTOCOL (FOR PAYOUTS) ---
    // Replace your financialProtocol section with this
    financialProtocol: {
      usdt_trc20: { type: String, default: "" },
      usdt_erc20: { type: String, default: "" },
      btc_address: { type: String, default: "" },
      taxId: { type: String, default: "" },
    },

    // Status & Compliance
    isVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    riskProfile: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium",
    },
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    traderProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Trader" },

    // Security & 2FA
    twoFactorSecret: String,
    twoFactorEnabled: { type: Boolean, default: false },
    twoFactorMethod: { type: String, enum: ["app", "email"], default: "app" },
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: Date,
    kycDetails: {
      documentUrl: { type: String, default: "" },
      documentType: { type: String, enum: ["ID", "Passport", "License", ""] },
      submittedAt: { type: Date },
      rejectionReason: { type: String, default: "" },
    },
  },
  { timestamps: true },
);

// --- PASSWORD HASHING ---
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
