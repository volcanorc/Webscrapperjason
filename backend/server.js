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

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

app.get("/scrape", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) {
      return res.status(400).json({
        success: false,
        message: "URL is required",
      });
    }

    console.log(`🔍 Scraping started for URL: ${url}`);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
      timeout: 600000,
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });

    console.log("📜 Starting full-page scroll...");
    let previousHeight = 0;
    while (true) {
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      if (previousHeight === scrollHeight) break;
      previousHeight = scrollHeight;
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await wait(3000);
    }
    console.log("✅ Scrolling complete.");

    console.log("🖼️ Extracting images...");
    let scrapedImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll("img")).map(img => img.src || img.getAttribute("srcset"));
    });

    console.log(`🔹 Found ${scrapedImages.length} images.`);

    // Skip the first 2 images
    if (scrapedImages.length > 2) {
      scrapedImages = scrapedImages.slice(2);
      console.log("🚀 First two images skipped.");
    } else {
      console.log("⚠️ Not enough images to skip two.");
    }

    // Find the index of the first "add_cart_default_cover" image
    const addCartIndex = scrapedImages.findIndex(imgSrc => imgSrc.includes("add_cart_default_cover"));

    // If "add_cart_default_cover" exists, slice the array to only include images before it
    if (addCartIndex !== -1) {
      scrapedImages = scrapedImages.slice(0, addCartIndex);
      console.log("🚫 Excluded images after 'add_cart_default_cover'.");
    }

    // Ensure there are at least 3 images
    while (scrapedImages.length < 3 && scrapedImages.length > 0) {
      // Repeat the available images to reach 3
      scrapedImages.push(...scrapedImages);
    }

    // Limit to exactly 3 images
    scrapedImages = scrapedImages.slice(0, 3);

    await browser.close();

    res.json({ success: true, images: scrapedImages });
    console.log("🎉 Scraping completed successfully.");
  } catch (error) {
    console.error("❌ Scraping Error:", error);
    res.status(500).json({
      success: false,
      message: "Scraping failed",
      error: error.message,
    });
  }
});

app.get('/api/health', (req, res) => {
  res.status(200).send("OK");
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
