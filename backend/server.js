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

//const imageUrlPattern = /^https:\/\/xcimg\.szwego\.com\/.*\.(jpg|jpeg|png|gif)\?.*/;

app.get("/scrape", async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ success: false, message: "URL is required" });
        }


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
            console.log("Axios failed, switching to Puppeteer.");
        }

      
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

  const page = await browser.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });
//await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

const scrapedImages = await page.evaluate(() => {
    const images = [];
    document.querySelectorAll("img").forEach((img) => {
        const src = img.src;
         if (src && /https:\/\/xcimg\.szwego\.com\/.*\.(jpg|jpeg|png|gif)\?.*/.test(src)) {
                    images.push(src);
                }
    });
    return images;
});

//await browser.close();
  await page.close();
res.json({
    success: true,
    method: "puppeteer",
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
