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
//  /^https:\/\/xcimg\.szwego\.com\/\d{8}\/([ai])\d+_\d+(?:_\d+)?\.jpg\?imageMogr2\/.*$/;
    /^https:\/\/xcimg\.szwego\.com\/\d{8}\/([ai])\d+_\d+(?:_\d+)?\.jpg/;


const MAX_TABS = 5;
const WAIT_TIME = 200000;
const browserQueue = [];

let browser;
(async () => {
  browser = await puppeteer.launch({
    headless: "new",
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--disable-gpu",
    ],
    timeout: 100000,
  });
})();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const scrapeImages = async (url) => {
  let page;
  try {
    if (!url) {
      throw new Error("URL is required");
    }

    console.log(`Scraping started for URL: ${url}`);

    while (browserQueue.length >= MAX_TABS) {
      console.log("Max tabs reached. Waiting for an available slot...");
      await wait(100000);
    }

    page = await browser.newPage();
    browserQueue.push(page);
    console.log(`Navigating to: ${url}`);

    await page.goto(url, { waitUntil: "load", timeout: 100000 });

    let previousHeight;
    console.log("Starting scroll loop...");
    while (true) {
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);

      if (previousHeight === scrollHeight) {
        console.log("End of page reached, stopping scroll.");
        break;
      }

      previousHeight = scrollHeight;
      console.log("Scrolling down...");
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

      await wait(WAIT_TIME);
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

    return { success: true, images: scrapedImages };
  } catch (error) {
    console.error("Scraping Error:", error);
    return { success: false, message: "Scraping failed", error: error.message };
  } finally {
    if (page) {
      await page.close();
      browserQueue.splice(browserQueue.indexOf(page), 1); 
    }
  }
};

app.get("/scrape", async (req, res) => {
  const url = req.query.url;
  const result = await scrapeImages(url);
  res.json(result);
});

process.on("SIGINT", async () => {
  console.log("Closing browser...");
  if (browser) await browser.close();
  process.exit();
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});

