// vercel cron: "0 * * * *"

const mongoose = require("mongoose");
const cloudinary = require("cloudinary").v2;

require("dotenv").config();

const transferSchema = new mongoose.Schema({
  code: String,
  secretWord: String,
  fileUrl: String,
  resourceType: String,
  expiresAt: Date,
});

const Transfer =
  mongoose.models.Transfer || mongoose.model("Transfer", transferSchema);

// Helper function
function extractPublicId(url) {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  return fileName.split(".")[0];
}

module.exports = async (req, res) => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const expiredTransfers = await Transfer.find({
      expiresAt: { $lt: new Date() },
    });

    for (const t of expiredTransfers) {
      const publicId = extractPublicId(t.fileUrl);
      try {
        await cloudinary.uploader.destroy(publicId, {
          resource_type: t.resourceType || "raw",
        });
      } catch (err) {
        console.error("Cloudinary delete error:", err.message);
      }
    }

    await Transfer.deleteMany({
      expiresAt: { $lt: new Date() },
    });

    return res.json({ message: "Expired transfers cleaned up." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cleanup failed." });
  }
};
