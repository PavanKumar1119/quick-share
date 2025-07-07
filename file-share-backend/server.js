require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;

const app = express();

app.use(
  cors({
    origin: ["https://quick-share-ui.vercel.app", "http://localhost:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Connect MongoDB
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error(err));

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Multer memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Define Transfer schema
const transferSchema = new mongoose.Schema({
  code: String,
  secretWord: String,
  fileUrl: String,
  resourceType: String,
  expiresAt: Date,
});

const Transfer = mongoose.model("Transfer", transferSchema);

// Upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file || !req.body.secretWord) {
      return res
        .status(400)
        .json({ error: "File and secret word are required." });
    }

    // Upload directly from memory buffer
    const streamUpload = () => {
      return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { resource_type: "auto" },
          (error, result) => {
            if (result) {
              resolve(result);
            } else {
              reject(error);
            }
          }
        );
        stream.end(req.file.buffer);
      });
    };

    const uploadResult = await streamUpload();

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    await Transfer.create({
      code,
      secretWord: req.body.secretWord,
      fileUrl: uploadResult.secure_url,
      resourceType: uploadResult.resource_type,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 min expiry
    });

    res.json({ code });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Download route
app.post("/download", async (req, res) => {
  try {
    const { code, secretWord } = req.body;

    const transfer = await Transfer.findOne({ code });

    if (!transfer) {
      return res.status(404).json({ error: "Invalid code." });
    }

    if (transfer.secretWord !== secretWord) {
      return res.status(403).json({ error: "Secret word mismatch." });
    }

    if (new Date() > transfer.expiresAt) {
      return res.status(410).json({ error: "Code expired." });
    }

    return res.json({ fileUrl: transfer.fileUrl });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Download failed" });
  }
});

// Cleanup route
app.delete("/cleanup", async (req, res) => {
  try {
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

    res.json({ message: "Expired transfers cleaned up." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Cleanup failed." });
  }
});

// Helper to extract Cloudinary public_id from URL
function extractPublicId(url) {
  const parts = url.split("/");
  const fileName = parts[parts.length - 1];
  return fileName.split(".")[0];
}

// ✅ Added root route so GET / works
app.get("/", (req, res) => {
  res.send("✅ Backend is running 🚀");
});

// app.listen(process.env.PORT || 5000, () => {
//   console.log(
//     `✅ Server running on http://localhost:${process.env.PORT || 5000}`
//   );
// });

module.exports = app;
