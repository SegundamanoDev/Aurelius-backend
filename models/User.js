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

    // Links
    wallet: { type: mongoose.Schema.Types.ObjectId, ref: "Wallet" },
    traderProfile: { type: mongoose.Schema.Types.ObjectId, ref: "Trader" }, // Only if role is 'trader'
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
