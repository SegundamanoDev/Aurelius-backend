const express = require("express");
const http = require("http"); // New
const { Server } = require("socket.io"); // New
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
require("./config/cron.js");

// Models & Controllers for Chat
const { saveMessage } = require("./controllers/chatController.js");
const chatRoutes = require("./routes/chatRoutes.js"); // Create this route file
const ChatMessage = require("./models/ChatMessage.js");

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // New: Wrap express app

// --- SOCKET.IO SETUP ---
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173/",
    // "https://aurelius-capital.vercel.app/api", // Adjust this to your frontend URL in production
    methods: ["GET", "POST"],
  },
});

io.on("connection", (socket) => {
  // Join Private Room
  socket.on("join_chat", (userId) => {
    socket.join(userId);
  });

  // Handle Live Message
  // server.js
  socket.on("send_message", async (data) => {
    try {
      // 1. SAVE to MongoDB (Replace 'Chat' with your actual Model name)
      const savedMsg = await ChatMessage.create({
        room: data.room,
        senderId: data.senderId,
        text: data.text,
        isAdmin: data.isAdmin,
        timestamp: new Date(),
        status: "delivered",
      });

      // 2. EMIT the saved message back to the room
      io.to(data.room).emit("receive_message", savedMsg);
    } catch (err) {
      console.error("Error saving chat:", err);
    }
  });
  // Handle Typing Status
  socket.on("typing", (data) => {
    socket.to(data.receiverId).emit("display_typing", data);
  });

  socket.on("disconnect", () => {});
});

// --- MIDDLEWARE ---
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- ROUTES ---
app.use("/api/auth", require("./routes/authRoutes.js"));
app.use("/api/users", require("./routes/userRoutes.js"));
app.use("/api/transactions", require("./routes/transactionRoutes.js"));
app.use("/api/traders", require("./routes/traderRoutes.js"));
app.use("/api/chat", chatRoutes); // New chat route

app.get("/ping", (req, res) => res.status(200).send("pong"));
app.get("/", (req, res) => res.send("Broker API is running..."));

// Error handling...
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;

// Use server.listen instead of app.listen
server.listen(PORT, () => {
  console.log(`
    🚀 Server running on port ${PORT}
    💬 Socket.io Real-time Engine Active
  `);
});
