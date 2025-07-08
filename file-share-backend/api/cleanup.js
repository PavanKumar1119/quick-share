// /api/cleanup.js
import { v2 as cloudinary } from "cloudinary";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Mongoose schema
const transferSchema = new mongoose.Schema({
  code: String,
  secretWord: String,
  fileUrl: String,
  resourceType: String,
  expiresAt: Date,
});

const Transfer =
  mongoose.models.Transfer || mongoose.model("Transfer", transferSchema);

// Helper to extract public ID
function extractPublicId(url) {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  return fileName.split(".")[0];
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI);
    }

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

    return res.status(200).json({
      message: "Expired transfers cleaned up.",
      cleaned: expiredTransfers.length,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cleanup failed." });
  }
}
