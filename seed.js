const mongoose = require("mongoose");
const Trader = require("./models/Trader");
require("dotenv").config();

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("🚀 Connected! Seeding equity curves..."))
  .catch((err) => console.log("❌ Connection Error:", err));

// HELPER: Generate cleaner, sequential history
function generateDummyHistory() {
  let history = [];
  let basePnl = 1200;

  // We want 20 days of data
  for (let i = 20; i >= 0; i--) {
    const volatility = Math.floor(Math.random() * 250) - 80;
    basePnl += volatility;

    const date = new Date();
    date.setDate(date.getDate() - i);

    history.push({
      closedAt: date,
      pnl: basePnl,
    });
  }
  return history;
}

const traders = [
  {
    username: "CryptoWhale_Alpha",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alpha",
    bio: "Focusing on high-leverage Bitcoin and Ethereum swing trades. 5 years of experience in market cycle analysis.",
    verified: true,
    totalROI: 145.2,
    monthlyROI: [
      { month: "Jan", roi: 12 },
      { month: "Feb", roi: 15 },
      { month: "Mar", roi: -5 },
      { month: "Apr", roi: 22 },
    ],
    winRate: 68,
    maxDrawdown: 12.5,
    riskScore: 7,
    equity: 50000,
    totalTrades: 450,
    avgTradeDuration: 1440, // 24 hours
    tradingStyle: "Swing",
    followersCount: 1240,
    totalCopiedCapital: 2500000,
    minCopyAmount: 500,
    performanceFeePercent: 15,
    assetAllocation: [
      { name: "BTC", value: 60 },
      { name: "ETH", value: 30 },
      { name: "USDT", value: 10 },
    ],
  },
  {
    username: "SteadyGainz_FX",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Steady",
    bio: "Low risk, consistent growth using institutional order flow. I never risk more than 1% per trade.",
    verified: true,
    totalROI: 42.8,
    monthlyROI: [
      { month: "Jan", roi: 4 },
      { month: "Feb", roi: 3.5 },
      { month: "Mar", roi: 5 },
      { month: "Apr", roi: 4.2 },
    ],
    winRate: 82,
    maxDrawdown: 4.1,
    riskScore: 2,
    equity: 25000,
    totalTrades: 890,
    avgTradeDuration: 120,
    tradingStyle: "Day Trading",
    followersCount: 3100,
    totalCopiedCapital: 8900000,
    minCopyAmount: 200,
    performanceFeePercent: 20,
    assetAllocation: [
      { name: "EUR/USD", value: 50 },
      { name: "GBP/JPY", value: 30 },
      { name: "Gold", value: 20 },
    ],
  },
  {
    username: "Sniper_Scalps",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sniper",
    bio: "Rapid execution on 1-minute charts. High frequency, small targets, tight stops.",
    verified: false,
    totalROI: 210.5,
    monthlyROI: [
      { month: "Jan", roi: 45 },
      { month: "Feb", roi: -10 },
      { month: "Mar", roi: 30 },
      { month: "Apr", roi: 55 },
    ],
    winRate: 55,
    maxDrawdown: 25.0,
    riskScore: 9,
    equity: 10000,
    totalTrades: 2400,
    avgTradeDuration: 5,
    tradingStyle: "Scalping",
    followersCount: 850,
    totalCopiedCapital: 450000,
    minCopyAmount: 100,
    performanceFeePercent: 25,
    assetAllocation: [
      { name: "SOL", value: 70 },
      { name: "PEPE", value: 20 },
      { name: "Other", value: 10 },
    ],
  },
  {
    username: "MacroPro_Global",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Macro",
    bio: "Global macro strategies. Long term holdings based on interest rates and CPI data.",
    verified: true,
    totalROI: 18.4,
    monthlyROI: [
      { month: "Jan", roi: 1 },
      { month: "Feb", roi: 2 },
      { month: "Mar", roi: 1.5 },
      { month: "Apr", roi: 0.5 },
    ],
    winRate: 90,
    maxDrawdown: 2.0,
    riskScore: 1,
    equity: 100000,
    totalTrades: 45,
    avgTradeDuration: 43200, // 30 days
    tradingStyle: "Swing",
    followersCount: 520,
    totalCopiedCapital: 12000000,
    minCopyAmount: 1000,
    performanceFeePercent: 10,
    assetAllocation: [
      { name: "S&P 500", value: 50 },
      { name: "Gold", value: 30 },
      { name: "Bonds", value: 20 },
    ],
  },
  {
    username: "Ghost_Trader",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ghost",
    bio: "Trading the volatility of the NY Open. Primarily focused on Nasdaq (NAS100).",
    verified: false,
    totalROI: 88.3,
    monthlyROI: [
      { month: "Jan", roi: 20 },
      { month: "Feb", roi: 18 },
      { month: "Mar", roi: 12 },
      { month: "Apr", roi: 15 },
    ],
    winRate: 64,
    maxDrawdown: 15.2,
    riskScore: 6,
    equity: 15000,
    totalTrades: 620,
    avgTradeDuration: 45,
    tradingStyle: "Day Trading",
    followersCount: 430,
    totalCopiedCapital: 1100000,
    minCopyAmount: 250,
    performanceFeePercent: 20,
    assetAllocation: [
      { name: "NAS100", value: 80 },
      { name: "US30", value: 20 },
    ],
  },
  {
    username: "Bullish_Beth",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Beth",
    bio: "Momentum trader focusing on breakout patterns in top 20 Alts.",
    verified: true,
    totalROI: 112.0,
    monthlyROI: [
      { month: "Jan", roi: 10 },
      { month: "Feb", roi: 40 },
      { month: "Mar", roi: 25 },
      { month: "Apr", roi: 12 },
    ],
    winRate: 71,
    maxDrawdown: 18.5,
    riskScore: 5,
    equity: 35000,
    totalTrades: 310,
    avgTradeDuration: 2880,
    tradingStyle: "Swing",
    followersCount: 980,
    totalCopiedCapital: 3200000,
    minCopyAmount: 300,
    performanceFeePercent: 15,
    assetAllocation: [
      { name: "DOT", value: 40 },
      { name: "LINK", value: 40 },
      { name: "AVAX", value: 20 },
    ],
  },
  {
    username: "IntraDay_King",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=King",
    bio: "I close all positions before the end of the day. No overnight risk.",
    verified: true,
    totalROI: 56.4,
    monthlyROI: [
      { month: "Jan", roi: 5 },
      { month: "Feb", roi: 8 },
      { month: "Mar", roi: 7 },
      { month: "Apr", roi: 6 },
    ],
    winRate: 75,
    maxDrawdown: 6.5,
    riskScore: 3,
    equity: 20000,
    totalTrades: 1200,
    avgTradeDuration: 180,
    tradingStyle: "Day Trading",
    followersCount: 2100,
    totalCopiedCapital: 5400000,
    minCopyAmount: 150,
    performanceFeePercent: 20,
    assetAllocation: [
      { name: "GBP/USD", value: 50 },
      { name: "AUD/USD", value: 50 },
    ],
  },
  {
    username: "Moon_Shot_Hunter",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Moon",
    bio: "Searching for the next 10x. High risk, extreme reward profile.",
    verified: false,
    totalROI: 540.2,
    monthlyROI: [
      { month: "Jan", roi: 120 },
      { month: "Feb", roi: -40 },
      { month: "Mar", roi: 80 },
      { month: "Apr", roi: 210 },
    ],
    winRate: 40,
    maxDrawdown: 45.0,
    riskScore: 10,
    equity: 5000,
    totalTrades: 150,
    avgTradeDuration: 10080,
    tradingStyle: "Swing",
    followersCount: 150,
    totalCopiedCapital: 120000,
    minCopyAmount: 50,
    performanceFeePercent: 30,
    assetAllocation: [
      { name: "Low-Caps", value: 90 },
      { name: "USDT", value: 10 },
    ],
  },
  {
    username: "Algorithm_Alpha",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Algo",
    bio: "Fully automated Python-based HFT strategy. Neutral delta market maker.",
    verified: true,
    totalROI: 29.5,
    monthlyROI: [
      { month: "Jan", roi: 2.5 },
      { month: "Feb", roi: 2.1 },
      { month: "Mar", roi: 2.8 },
      { month: "Apr", roi: 2.3 },
    ],
    winRate: 94,
    maxDrawdown: 1.5,
    riskScore: 1,
    equity: 500000,
    totalTrades: 15000,
    avgTradeDuration: 1,
    tradingStyle: "Scalping",
    followersCount: 4500,
    totalCopiedCapital: 25000000,
    minCopyAmount: 2000,
    performanceFeePercent: 15,
    assetAllocation: [{ name: "BTC-PERP", value: 100 }],
  },
  {
    username: "GoldFinder_99",
    profileImage: "https://api.dicebear.com/7.x/avataaars/svg?seed=Gold",
    bio: "XAU/USD specialist. Following central bank trends and geopolitical shifts.",
    verified: true,
    totalROI: 67.2,
    monthlyROI: [
      { month: "Jan", roi: 8 },
      { month: "Feb", roi: 12 },
      { month: "Mar", roi: -2 },
      { month: "Apr", roi: 10 },
    ],
    winRate: 69,
    maxDrawdown: 9.8,
    riskScore: 4,
    equity: 30000,
    totalTrades: 280,
    avgTradeDuration: 720,
    tradingStyle: "Day Trading",
    followersCount: 880,
    totalCopiedCapital: 1900000,
    minCopyAmount: 400,
    performanceFeePercent: 20,
    assetAllocation: [{ name: "Gold", value: 100 }],
  },
];

const seedDB = async () => {
  try {
    // 1. Clear existing to prevent duplicate errors
    await Trader.deleteMany({});
    console.log("🗑️ Database cleared.");

    // 2. Map and generate
    const tradersWithData = traders.map((t) => ({
      ...t,
      user: new mongoose.Types.ObjectId(),
      recentHistory: generateDummyHistory(),
    }));

    // 3. Insert
    await Trader.insertMany(tradersWithData);

    console.log("✅ Seed successful! Each trader now has 20 history points.");
    process.exit();
  } catch (err) {
    console.error("❌ Seed failed:", err.message);
    process.exit(1);
  }
};

seedDB();
