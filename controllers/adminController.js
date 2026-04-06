const User = require("../models/User");

exports.getPendingKYCs = async (req, res) => {
  try {
    const pendingUsers = await User.find({ kycStatus: "pending" })
      .select("firstName lastName email kycDetails kycStatus createdAt")
      .sort({ "kycDetails.submittedAt": -1 });

    res.status(200).json(pendingUsers);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error fetching pending KYC", error: error.message });
  }
};

exports.reviewKYC = async (req, res) => {
  const { status, rejectionReason } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    user.kycStatus = status;
    if (status === "rejected") {
      user.kycDetails.rejectionReason =
        rejectionReason || "Documents unclear or invalid.";
    } else {
      user.isVerified = true;
    }

    await user.save();
    res.status(200).json({ message: `KYC ${status} successfully`, user });
  } catch (error) {
    res.status(400).json({ message: "Review update failed" });
  }
};
