const ChatMessage = require("../models/ChatMessage");

// @desc    Get chat history for a specific user room
// @route   GET /api/chat/history/:userId
exports.getChatHistory = async (req, res) => {
  try {
    const messages = await ChatMessage.find({ room: req.params.userId }).sort({
      timestamp: 1,
    });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Failed to load chat history" });
  }
};

// Logic to save message (Used by Socket.io)
exports.saveMessage = async (data) => {
  try {
    const newMessage = new ChatMessage({
      room: data.room,
      sender: data.senderId,
      text: data.text,
      isAdmin: data.isAdmin,
    });
    return await newMessage.save();
  } catch (error) {
    console.error("Socket DB Save Error:", error);
  }
};
