const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

/*const imageUrlPattern =
  /^https:\/\/xcimg\.szwego\.com\/\d{8}\/a\d+_\d+\.jpg\?imageMogr2\/.*$/; 
  */
const imageUrlPattern =
  /^https:\/\/xcimg\.szwego\.com\/\d{8}\/([ai])\d+_\d+(?:_\d+)?\.jpg\?imageMogr2\/.*$/;

app.get("/scrape", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    // Use Puppeteer directly
    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
          timeout: 1000000,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "load", timeout: 60000 });

    const scrapedImages = await page.evaluate((pattern) => {
      const images = [];
      document.querySelectorAll("img").forEach((img) => {
        const src = img.src;
        if (src && new RegExp(pattern).test(src)) {
          images.push(src);
        }
      });
      return images;
    }, imageUrlPattern.source);


    await page.close();
    res.json({ success: true, method: "puppeteer", images: scrapedImages });
  } catch (error) {
    console.error("Scraping Error:", error);
    res.status(500).json({
      success: false,
      message: "Scraping failed",
      error: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
