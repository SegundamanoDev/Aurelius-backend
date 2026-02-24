const Trader = require("../models/Trader");
const Trade = require("../models/Trade");

/**
 * @desc Get all traders with advanced professional filters
 * @route GET /api/traders
 */
exports.getTraders = async (req, res) => {
  try {
    const {
      search,
      roiTimeframe = "totalROI",
      minROI,
      maxRisk,
      minWinRate,
      maxDrawdown,
      asset,
      sort = "totalROI",
      order = "desc",
      page = 1,
      limit = 20,
    } = req.query;

    const query = { isActive: true };

    if (search) query.username = { $regex: search, $options: "i" };
    if (minROI) query[roiTimeframe] = { $gte: Number(minROI) };
    if (maxRisk) query.riskScore = { $lte: Number(maxRisk) };
    if (minWinRate) query.winRate = { $gte: Number(minWinRate) };
    if (maxDrawdown) query.maxDrawdown = { $lte: Number(maxDrawdown) };
    if (asset) query.tradingStyle = asset;

    const sortOption = {};
    sortOption[sort] = order === "asc" ? 1 : -1;

    const traders = await Trader.find(query)
      .select("-__v")
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const total = await Trader.countDocuments(query);

    res.status(200).json({
      success: true,
      count: traders.length,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
      },
      data: traders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching traders" });
  }
};

/**
 * @desc Get detailed trader profile + Stats for charts
 * @route GET /api/traders/:id
 */
exports.getTraderProfile = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id).populate(
      "user",
      "firstName lastName isVerified",
    );

    if (!trader) return res.status(404).json({ message: "Trader not found" });

    const openTrades = await Trade.find({ trader: trader._id, status: "open" });
    const tradeHistory = await Trade.find({
      trader: trader._id,
      status: "closed",
    })
      .sort({ closedAt: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: {
        profile: trader,
        activePositions: openTrades,
        recentHistory: tradeHistory,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc Create Trader Profile (User upgrades to Trader)
 * @route POST /api/traders/enroll
 */
exports.becomeTrader = async (req, res) => {
  try {
    const existing = await Trader.findOne({ user: req.user.id });
    if (existing)
      return res.status(400).json({ message: "Trader profile already exists" });

    const newTrader = await Trader.create({
      user: req.user.id,
      ...req.body, // includes username, minCopyAmount, tradingStyle
    });

    res.status(201).json({ success: true, data: newTrader });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc Update trader profile (Owner or Admin only)
 * @route PUT /api/traders/:id
 */
exports.updateTrader = async (req, res) => {
  try {
    let trader = await Trader.findById(req.params.id);

    if (!trader) return res.status(404).json({ message: "Trader not found" });

    // Security Check: Only the owner or an admin can update
    if (trader.user.toString() !== req.user.id && req.user.role !== "admin") {
      return res
        .status(403)
        .json({ message: "Not authorized to update this profile" });
    }

    trader = await Trader.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, data: trader });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

/**
 * @desc Delete trader profile (Admin only)
 * @route DELETE /api/traders/:id
 */
exports.deleteTrader = async (req, res) => {
  try {
    const trader = await Trader.findById(req.params.id);

    if (!trader) return res.status(404).json({ message: "Trader not found" });

    // Note: Usually we don't delete financial data, we just set isActive: false
    // But for a full CRUD, here is the delete:
    await trader.deleteOne();

    res.status(200).json({ success: true, message: "Trader profile removed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
