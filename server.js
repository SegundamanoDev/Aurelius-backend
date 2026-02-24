const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const morgan = require("morgan");
const connectDB = require("./config/db.js");
require("./config/cron.js");

// Load Environment Variables
dotenv.config();

// Connect to Database
connectDB();

const app = express();

// --- MIDDLEWARE ---
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// --- ROUTES ---
app.use("/api/auth", require("./routes/authRoutes.js"));
app.use("/api/transactions", require("./routes/transactionRoutes.js"));
app.use("/api/wallet", require("./routes/walletRoutes.js")); // Required for funding check
app.use("/api/users", require("./routes/userRoutes.js"));
app.use("/api/traders", require("./routes/traderRoutes.js"));
app.use("/api/traders/copy", require("./routes/copyRoutes.js"));

// --- HEALTH CHECKS ---
app.get("/ping", (req, res) => res.status(200).send("pong"));
app.get("/", (req, res) => res.send("Broker API is running..."));

// --- ERROR HANDLING ---
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

app.listen(PORT, () => {
  console.log(
    `🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`,
  );
});
