const User = require("../models/User.js");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Wallet = require("../models/Wallet.js");
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const crypto = require("crypto");
const sendEmail = require("../utils/sendEmail");

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

exports.registerUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      firstName,
      lastName,
      middleName,
      email,
      password,
      confirmPassword,
      currency, // This will go to the Wallet
      sex,
      maritalStatus,
      occupation,
      address,
    } = req.body;

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match.");
    }

    const userExists = await User.findOne({ email });
    if (userExists) throw new Error("Email already registered.");

    // 1. Create User (Note: currency removed from here, financialProtocol initialized)
    const [user] = await User.create(
      [
        {
          firstName,
          lastName,
          middleName,
          email,
          password,
          sex,
          maritalStatus,
          occupation,
          address,
          financialProtocol: {
            payoutAddress: "",
            payoutNetwork: "",
            taxId: "",
          },
        },
      ],
      { session },
    );

    // 2. Create Wallet and link to User
    const [wallet] = await Wallet.create(
      [
        {
          user: user._id,
          currency: currency || "USD",
          totalBalance: 0,
          freeBalance: 0,
          allocatedBalance: 0,
          marginUsed: 0,
        },
      ],
      { session },
    );

    // 3. IMPORTANT UPDATE: Save the wallet reference back to the User
    user.wallet = wallet._id;
    await user.save({ session });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
        wallet: wallet._id,
      },
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    res.status(400).json({ message: error.message });
  }
};

// --- UPDATED LOGIN WITH 2FA DETECTION ---
exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    if (user && (await user.matchPassword(password))) {
      // 1. Check if 2FA is enabled
      if (user.twoFactorEnabled) {
        return res.status(200).json({
          status: "2FA_REQUIRED",
          _id: user._id,
          message: "Please enter your 6-digit authenticator code",
        });
      }

      // 2. No 2FA? Proceed with normal login
      await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        currency: user.currency,
        accountType: user.accountType,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- NEW: CHANGE PASSWORD LOGIC ---
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // req.user is populated by your protect middleware
    const user = await User.findById(req.user._id);

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ message: "Current password is incorrect" });
    }

    // Update password - the pre-save hook will hash this automatically
    user.password = newPassword;
    await user.save();

    res
      .status(200)
      .json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Generate 2FA Setup
exports.setup2FA = async (req, res) => {
  try {
    const secret = speakeasy.generateSecret({
      name: `Aurelius (${req.user.email})`,
    });
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

    res.json({ secret: secret.base32, qrCode: qrCodeUrl });
  } catch (error) {
    res.status(500).json({ message: "Could not generate 2FA setup" });
  }
};

// Verify and Enable 2FA
exports.verifyAndEnable2FA = async (req, res) => {
  const { token, secret } = req.body;

  const verified = speakeasy.totp.verify({
    secret: secret,
    encoding: "base32",
    token: token,
  });

  if (!verified) return res.status(400).json({ message: "Invalid code" });

  const user = await User.findById(req.user._id);
  user.twoFactorSecret = secret;
  user.twoFactorEnabled = true;
  await user.save();

  res.json({ success: true, message: "2FA Enabled successfully" });
};

// --- NEW: LOGIN 2FA VERIFICATION ---
// This endpoint is used during the login flow if status is 2FA_REQUIRED
exports.verifyLogin2FA = async (req, res) => {
  const { userId, token } = req.body;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const verified = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: "base32",
      token: token,
    });

    if (!verified) return res.status(400).json({ message: "Invalid 2FA code" });

    // Login successful
    res.json({
      _id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 1. FORGOT PASSWORD (Send Email) ---
exports.forgotPassword = async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user)
      return res
        .status(404)
        .json({ message: "No account found with that email." });

    const resetToken = crypto.randomBytes(32).toString("hex");

    // Hash and set to user object
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 mins

    await user.save({ validateBeforeSave: false });

    // Link matches your React route: /reset-password/:token
    const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;

    const htmlContent = `
      <div style="max-width: 600px; margin: auto; padding: 20px; font-family: Arial, sans-serif; border: 1px solid #e2e8f0; border-radius: 12px;">
        <h2 style="color: #0ea5e9;">Aurelius Capital Security</h2>
        <p>A password reset was requested for your account. If this wasn't you, please ignore this email.</p>
        <p>This link is valid for <strong>10 minutes</strong>:</p>
        <a href="${resetURL}" style="display: inline-block; padding: 12px 24px; background-color: #0ea5e9; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">Reset Password</a>
        <p style="margin-top: 20px; font-size: 12px; color: #64748b;">If the button doesn't work, copy and paste this link: <br/> ${resetURL}</p>
      </div>
    `;

    await sendEmail({
      email: user.email,
      subject: "Aurelius Capital - Password Reset Request",
      message: `Reset your password here: ${resetURL}`,
      html: htmlContent,
    });

    res
      .status(200)
      .json({ success: true, message: "Secure reset link sent to email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// --- 2. RESET PASSWORD (Update DB) ---
exports.resetPassword = async (req, res) => {
  try {
    // Hash the token from the URL to match the one in DB
    const hashedToken = crypto
      .createHash("sha256")
      .update(req.params.token)
      .digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    if (!user)
      return res
        .status(400)
        .json({ message: "Token is invalid or has expired" });

    user.password = req.body.password;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.status(200).json({ message: "Password reset successful!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
