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

const imageUrlPattern =
  /^https:\/\/xcimg\.szwego\.com\/\d{8}\/([ai])\d+_\d+(?:_\d+)?\.jpg\?imageMogr2\/.*$/;

app.get("/scrape", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({ success: false, message: "URL is required" });
    }

    console.log(`Scraping started for URL: ${url}`);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
      timeout: 60000, // Reduce timeout to 60 seconds
    });

    const page = await browser.newPage();
    console.log("Navigating to the page...");
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    console.log("Scrolling to load images...");
    for (let i = 0; i < 5; i++) { // Limit scrolling attempts
      await page.evaluate(() => window.scrollBy(0, window.innerHeight));
      await new Promise(resolve => setTimeout(resolve, 1000)); // Shorter wait time
    }

    console.log("Scraping images...");
    const scrapedImages = await page.evaluate((pattern) => {
      return [...document.querySelectorAll("img")]
        .map(img => img.src)
        .filter(src => new RegExp(pattern).test(src));
    }, imageUrlPattern.source);

    console.log(`Found ${scrapedImages.length} images.`);

    await browser.close();
    res.json({ success: true, method: "puppeteer", images: scrapedImages });
    console.log("Scraping completed successfully.");
  } catch (error) {
    console.error("Scraping Error:", error);
    res.status(500).json({ success: false, message: "Scraping failed", error: error.message });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
 
