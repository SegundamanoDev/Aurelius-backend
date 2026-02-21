const cron = require("node-cron");
const https = require("https");

// Your Render backend URL
const backendUrl = "https://aurelius-backend-dsdm.onrender.com/api";

// Schedule a task to run every 14 minutes
cron.schedule("*/14 * * * *", () => {
  console.log("Sending self-ping to keep server awake...");

  https
    .get(backendUrl, (res) => {
      if (res.statusCode === 200) {
        console.log("Server awoken successfully");
      } else {
        console.error(`Failed to wake server: ${res.statusCode}`);
      }
    })
    .on("error", (err) => {
      console.error("Error during self-ping:", err.message);
    });
});
