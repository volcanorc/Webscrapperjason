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
  /^https:\/\/xcimg\.szwego\.com\/\d{8}\/([ai])\d+_\d+(?:_\d+)?\.jpg/;

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
      timeout: 600000,
    });

 const page = await browser.newPage();
console.log("Navigating to the page...");
//await page.goto(url, { waitUntil: "load", timeout: 60000 });
await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
    
let previousHeight = 0;
console.log("Starting scroll loop...");
while (true) {
  const scrollHeight = await page.evaluate(() => document.body.scrollHeight);

  if (previousHeight === scrollHeight) {
    console.log("End of page reached, stopping scroll.");
    break;
  }

  previousHeight = scrollHeight;
  console.log("Scrolling down the page...");
  
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });

  await wait(3000); 
}


    console.log("Scraping images...");
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

    console.log(`Found ${scrapedImages.length} images.`);

    await page.close();
    res.json({ success: true, method: "puppeteer", images: scrapedImages });
    console.log("Scraping completed successfully.");
  } catch (error) {
    console.error("Scraping Error:", error);
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
  console.log(`Server running on port ${PORT}`);
});
