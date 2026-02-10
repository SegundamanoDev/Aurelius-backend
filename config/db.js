const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);

    console.log(`
    📁 MongoDB Connected: ${conn.connection.host}
    ✅ Database Connection Stable
    `);
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    // Exit process with failure
    process.exit(1);
  }
};

module.exports = connectDB;
