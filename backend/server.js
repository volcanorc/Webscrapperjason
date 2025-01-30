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
            headless: "new", // Use the new headless mode
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
        });

  const page = await browser.newPage();
await page.goto(url, { waitUntil: "load", timeout: 60000 });

await page.waitForSelector("h1, h2, h3, h4, h5, h6", { timeout: 10000 }).catch(() => {
    // If no headings are found within the timeout, we just move forward with images
    console.log("No headings found, proceeding to scrape images.");
});

// Scrape headings
const scrapedHeadings = await page.evaluate(() => {
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")];
    if (headings.length === 0) {
        return null; // If no headings are found, return null
    }
    return headings.map((element) => ({
        tag: element.tagName,
        text: element.innerText.trim(),
    }));
});

// Scrape images
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

await browser.close();

// Send response with headings and images
res.json({
    success: true,
    method: "puppeteer",
    data: scrapedHeadings, // If no headings are found, it will be null
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
