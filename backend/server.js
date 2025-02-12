const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"], 
}));

console.log(`[SERVER] Starting Express server...`);

// Route to scrape data
app.get("/scrape", async (req, res) => {
    try {
        const url = req.query.url;
        console.log(`[REQUEST] Received scraping request for URL: ${url}`);

        if (!url) {
            console.log(`[ERROR] No URL provided.`);
            return res.status(400).json({ success: false, message: "URL is required" });
        }

        console.log(`[INFO] Attempting to scrape using Axios...`);
        try {
            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            let data = [];

            $("h1, h2, h3, h4, h5, h6").each((_, element) => {
                data.push({
                    tag: $(element).prop("tagName"),
                    text: $(element).text().trim(),
                });
            });

            if (data.length > 0) {
                console.log(`[SUCCESS] Scraped headings using Axios.`);
                return res.json({ success: true, method: "cheerio", data });
            }
        } catch (axiosError) {
            console.log(`[WARNING] Axios failed. Switching to Puppeteer.`);
        }

        console.log(`[INFO] Launching Puppeteer...`);
        const browser = await puppeteer.launch({
            headless: "new",
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu"
            ],
        });

        console.log(`[INFO] Opening new Puppeteer page...`);
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "load", timeout: 60000 });

        console.log(`[INFO] Extracting images from the page...`);
        const scrapedImages = await page.evaluate(() => {
            const images = [];
            document.querySelectorAll("img").forEach((img) => {
                const src = img.src;
                images.push(src);
            });
            return images;
        });

        console.log(`[SUCCESS] Scraped ${scrapedImages.length} images from the page.`);

        await page.close();
        await browser.close();

        res.json({
            success: true,
            method: "puppeteer",
            images: scrapedImages,
        });

    } catch (error) {
        console.error(`[ERROR] Scraping Error: ${error.message}`);
        res.status(500).json({ success: false, message: "Scraping failed", error: error.message });
    }
});

// Start the server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running on port ${PORT}`);
});
