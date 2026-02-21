const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
require("./config/cron.js");
// Route consts
const authRoutes = require("./routes/authRoutes.js");
const userRoutes = require("./routes/userRoutes.js");
const transactionRoutes = require("./routes/transactionRoutes.js");
const traderRoutes = require("./routes/traderRoutes.js");

// Load Environment Variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// --- MIDDLEWARE ---
// Use Morgan for logging API requests during development
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json());

// The route the cron job hits
app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// --- ROUTES ---
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/traders", traderRoutes);

// --- BASE ROUTE ---
app.get("/", (req, res) => {
  res.send("Broker API is running smoothly...");
});

// --- ERROR HANDLING MIDDLEWARE ---
// Catch-all for 404 Not Found
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
});

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({
    message: err.message,
    stack: process.env.NODE_ENV === "production" ? null : err.stack,
  });
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`
    🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}
    🛡️  Security Middleware Active
    💹 Ready for Trading Activity
  `);
});
