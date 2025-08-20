// src/main.ts
import puppeteer from "puppeteer";
import { RandomUserService, type RandomUser, } from "./jackpota/RandomUserService";
import { fillRegistrationForm } from "./jackpota/jackpota";

// Optional env/config
const TARGET_URL = process.env.TARGET_URL ?? "https://www.jackpota.com/register";
const HEADLESS = (process.env.HEADLESS ?? "false").toLowerCase() === "true";
const BEFORE_PATH = process.env.SCREENSHOT_BEFORE ?? "jackpota-before-fill.png";
const AFTER_PATH = process.env.SCREENSHOT_AFTER ?? "jackpota-after-fill.png";


async function main() {
  console.log("Starting Puppeteer…");

  const browser = await puppeteer.launch({
    headless: HEADLESS, // true for CI
    defaultViewport: { width: 1280, height: 720 },
  });

  try {
    const page = await browser.newPage();

    console.log(`Navigating to ${TARGET_URL}…`);
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });

    // Wait for the form (email or any form element is fine as readiness signal)
    await page.waitForSelector('input[type="email"], input[name="email"], form', {
      timeout: 10_000,
    });

    // Screenshot before filling
    console.log("Taking screenshot before fill…");
    const beforePath = /\.(png|jpeg|webp)$/i.test(BEFORE_PATH) ? BEFORE_PATH : `${BEFORE_PATH}.png`;
    await page.screenshot({ path: beforePath as `${string}.png` | `${string}.jpeg` | `${string}.webp` });

    // ---- Build user (User logic stays fully separate) ----
    const userService = new RandomUserService({ require21Plus: true });
    const user: RandomUser = await userService.buildUser();
    console.log("Built user:", user);

    // ---- Fill form (this function should NOT build users) ----
    await fillRegistrationForm(page, user);

    console.log("Taking screenshot after fill…");
    const afterPath = /\.(png|jpeg|webp)$/i.test(AFTER_PATH) ? AFTER_PATH : `${AFTER_PATH}.png`;
    await page.screenshot({ path: afterPath as `${string}.png` | `${string}.jpeg` | `${string}.webp` });

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


