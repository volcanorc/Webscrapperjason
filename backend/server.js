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
    origin: "*",  // You can specify the allowed origins here instead of "*"
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"], // Adjust according to your requirements
}));

app.get("/scrape", async (req, res) => {
    try {
        const url = req.query.url;
        if (!url) {
            return res.status(400).json({ success: false, message: "URL is required" });
        }

        // Try scraping with Axios and Cheerio first
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
            console.log("Axios failed, switching to Puppeteer...");
        }

        // Fallback to Puppeteer if Axios fails
        const browser = await puppeteer.launch({

            headless: "new", // Use the new headless mode
            args: [
            ],
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

        // Wait for at least one heading element to be present
        await page.waitForSelector("h1, h2, h3, h4, h5, h6", { timeout: 10000 });

        const scrapedData = await page.evaluate(() => {
            return [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")].map((element) => ({
                tag: element.tagName,
                text: element.innerText.trim(),
            }));
        });

       await browser.close();
        res.json({ success: true, method: "puppeteer", data: scrapedData });
       

    } catch (error) {
        console.error("Scraping Error:", error);
        res.status(500).json({ success: false, message: "Scraping failed", error: error.message });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
});
