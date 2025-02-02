const express = require("express");
const playwright = require("playwright");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
    origin: "*", 
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"], 
}));

app.get("/scrape", async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ success: false, message: "URL is required" });
        }

        // First, try scraping using axios and cheerio for fast HTML parsing
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
                return res.json({ success: true, method: "cheerio", data });
            }
        } catch (axiosError) {
            console.log("Axios failed, switching to Playwright.");
        }

        // Use Playwright for JavaScript-rendered content
        const browser = await playwright.chromium.launch({
            headless: true,  // Change to 'false' to see the browser in action
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-accelerated-2d-canvas",
                "--disable-gpu"
            ],
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "load", timeout: 60000 });

        const scrapedImages = await page.evaluate(() => {
            const images = [];
            document.querySelectorAll("img").forEach((img) => {
                const src = img.src;
                if (src) {
                    images.push(src);
                }
            });
            return images;
        });

        await page.close();
        //await browser.close();

        res.json({
            success: true,
            method: "playwright",
            images: scrapedImages,
        });
    } catch (error) {
        console.error("Scraping Error:", error);
        res.status(500).json({ success: false, message: "Scraping failed", error: error.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
