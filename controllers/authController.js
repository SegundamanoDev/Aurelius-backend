const User = require("../models/User.js");
const jwt = require("jsonwebtoken");

exports.registerUser = async (req, res) => {
  const {
    firstName,
    lastName,
    middleName,
    email,
    password,
    confirmPassword,
    currency,
    sex,
    maritalStatus,
    occupation,
    address,
  } = req.body;

  try {
    // 1. Basic Validation
    if (password !== confirmPassword) {
      return res.status(400).json({ message: "Passwords do not match." });
    }

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already registered." });

    // 2. Create User
    // The password will be hashed automatically by the pre-save hook in the model
    const user = await User.create({
      firstName,
      lastName,
      middleName,
      email,
      password,
      currency,
      sex,
      maritalStatus,
      occupation,
      address,
    });

    res.status(201).json({
      success: true,
      user: {
        _id: user._id,
        email: user.email,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Helper to generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "30d" });
};

exports.loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Check if user exists and password matches
    if (user && (await user.matchPassword(password))) {
      // Use findByIdAndUpdate to update lastLogin WITHOUT triggering hooks
      await User.findByIdAndUpdate(user._id, { lastLogin: Date.now() });

      res.json({
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        currency: user.currency,
        accountType: user.accountType,
        balance: user.balance,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
