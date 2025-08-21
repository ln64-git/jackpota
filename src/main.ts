import { signUpAndVerify } from "./jackpota/pages/signup";
import puppeteer, { Page } from "puppeteer";

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

    const ok = await signUpAndVerify(page);
    console.log(ok ? "✅ Flow completed" : "❌ Flow aborted");

    await page.screenshot({ path: "jackpota-after.png" });
  } catch (err) {
    console.error("Unhandled error:", err);
  } finally {
    if (headless) await browser.close();
  }
}

main().catch(console.error);
