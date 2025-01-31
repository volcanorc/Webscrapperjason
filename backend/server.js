const express = require("express");
const axios = require("axios");
const cheerio = require("cheerio");
const puppeteer = require("puppeteer");
const cors = require("cors");
const app = express();

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

        try {
            const response = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(response.data);
            let data = [];

            $("img").each((_, element) => {
                const src = $(element).attr("src");
                if (src) {
                    data.push({ src });
                }
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
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });

    const scrapedData = await page.evaluate(() => {
    return [...document.querySelectorAll("img")]
        .map(img => ({
            src: img.src || img.getAttribute("data-src") || null
        }))
        .filter(img => img.src !== null); 
});


        //await browser.close();
        await page.close();
        res.json({ success: true, method: "puppeteer", data: scrapedData });

    } catch (error) {
        console.error("Scraping Error:", error);
        res.status(500).json({ success: false, message: "Scraping failed", error: error.message });
    }
});

app.listen(3000, () => console.log("Server running on port 3000"));
