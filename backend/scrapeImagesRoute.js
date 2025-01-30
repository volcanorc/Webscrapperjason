const express = require("express");
const scrapeImages = require("./scrapeImages"); // Import the scrapeImages function

const router = express.Router();

router.get("/scrape-images", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    const images = await scrapeImages(url);

    if (images.length > 0) {
      return res.json({ success: true, images });
    } else {
      return res.status(404).json({ success: false, message: "No images found" });
    }
  } catch (error) {
    console.error("Image Scraping Error:", error);
    res.status(500).json({ success: false, message: "Failed to scrape images", error: error.message });
  }
});

module.exports = router;
