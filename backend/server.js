const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const axios = require("axios");
const cheerio = require("cheerio");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

puppeteer.use(StealthPlugin());
app.use(cors());

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
            console.log("Axios failed, switching to Puppeteer...");
        }

        // Launch Puppeteer with headless mode
        const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium';
        const browser = await puppeteer.launch({
            headless: true,
            executablePath,
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-software-rasterizer",
                "--single-process",
                "--no-zygote"
            ]
        });

        const page = await browser.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

        const data = await page.evaluate(() => {
            let elements = [];
            const headers = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
            headers.forEach(header => {
                elements.push({
                    tag: header.tagName,
                    text: header.innerText.trim()
                });
            });
            return elements;
        });

        await browser.close();
        return res.json({ success: true, method: "puppeteer", data });

    } catch (error) {
        console.error("Error during scraping:", error);
        return res.status(500).json({ success: false, message: "Error during scraping", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
