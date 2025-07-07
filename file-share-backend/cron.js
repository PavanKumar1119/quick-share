const axios = require("axios");
const cron = require("node-cron");

cron.schedule("*/10 * * * *", async () => {
  try {
    console.log("Running cleanup...");
    await axios.delete("http://localhost:5000/cleanup");
    console.log("Cleanup done!");
  } catch (err) {
    console.error("Cleanup error:", err.message);
  }
});
