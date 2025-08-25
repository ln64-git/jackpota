import { signUpAndVerify } from "./jackpota/pages/signup";
import puppeteer, { Page } from "puppeteer";
import { playSpinAWin } from "./jackpota/pages/spin-a-win";

const headless = false
let page: Page | null = null;

async function main() {
  const browser = await puppeteer.launch({
    headless,
    defaultViewport: { width: 1280, height: 720 },
  });

  try {
    page = await browser.newPage();
    await page.goto("https://www.jackpota.com/register", { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"], input[name="email"], form', {
      timeout: 10_000,
    });

    // 1. Sign up and verify
    await signUpAndVerify(page);

    // Uncomment and implement playSpinAWinGame if needed
    await playSpinAWin(page);

    await page.screenshot({ path: "jackpota-after.png" });
  } catch (err) {
    console.error("Unhandled error:", err);
  } finally {
    if (headless) await browser.close();
  }
}

main().catch(console.error);
