const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");

puppeteer.use(StealthPlugin());

async function scrapeImages(url) {
    const browser = await puppeteer.launch({
        headless: "new",
        args: [],
    });

    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

    await page.waitForSelector("img", { timeout: 10000 });

    const imageData = await page.evaluate(() => {
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
    return imageData;
}

module.exports = scrapeImages;
