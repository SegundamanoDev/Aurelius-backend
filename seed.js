const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const Trader = require("./models/Trader"); // Adjust path to where your model is
require("dotenv").config(); // If you use a .env file for your MONGO_URI

const seedTraders = async () => {
  try {
    // 1. Connect to Database
    // Replace the string below with your actual MongoDB URI if not using .env
    const MONGO_URI =
      process.env.MONGO_URI || "mongodb://localhost:27017/your_db_name";
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB...");

    // 2. Read the JSON file
    const jsonPath = path.join(__dirname, "utils", "traders.json");
    const tradersData = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));

    // 3. Clear existing data (Optional but recommended for a fresh start)
    await Trader.deleteMany();
    console.log("Existing traders cleared.");

    // 4. Insert the data
    await Trader.insertMany(tradersData);
    console.log(
      `${tradersData.length} Traders successfully mirrored to terminal! 🚀`,
    );

    // 5. Close connection
    process.exit();
  } catch (error) {
    console.error("Error seeding data:", error);
    process.exit(1);
  }
};

seedTraders();
