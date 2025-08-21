import puppeteer from "puppeteer";
import { fillRegistrationForm } from "./jackpota/jackpota";
import { User } from "./jackpota/User/User";

const TARGET_URL = process.env.TARGET_URL ?? "https://www.jackpota.com/register";
const HEADLESS = (process.env.HEADLESS ?? "false").toLowerCase() === "true";
const BEFORE_PATH = process.env.SCREENSHOT_BEFORE ?? "jackpota-before-fill.png";
const AFTER_PATH = process.env.SCREENSHOT_AFTER ?? "jackpota-after-fill.png";

async function main() {
  console.log("Starting Puppeteer…");
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1280, height: 720 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10_000 });

    console.log("Taking screenshot before fill…");
    const beforePath = /\.(png|jpe?g|webp)$/i.test(BEFORE_PATH) ? BEFORE_PATH : `${BEFORE_PATH}.png`;
    await page.screenshot({ path: beforePath as `${string}.png` });

    // Build a user
    const user = new User();
    console.log("Built user:", user);

    await fillRegistrationForm(page, user);

    console.log("Taking screenshot after fill…");
    const afterPath = /\.(png|jpe?g|webp)$/i.test(AFTER_PATH) ? AFTER_PATH : `${AFTER_PATH}.png`;
    await page.screenshot({ path: afterPath as `${string}.png` });

    console.log("Form automation completed successfully!");
  } catch (err) {
    console.error("An error occurred:", err);
  } finally {
    if (HEADLESS) {
      await browser.close();
    } else {
      console.log("Browser kept open for inspection. Close it manually when done.");
    }
  }
}

main().catch(console.error);
