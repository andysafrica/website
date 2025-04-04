const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure /images directory exists
const imagesDir = path.join(__dirname, 'images');
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir);
}

// Configure multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, imagesDir),
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `img-${timestamp}${ext}`);
  }
});
const upload = multer({ storage });

// Mount at /upload-image — so POST /upload-image works
router.post('/', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const imageUrl = `/images/${req.file.filename}`;
  console.log(`🖼️ Image uploaded: ${imageUrl}`);
  res.json({ url: imageUrl });
});

module.exports = router;
