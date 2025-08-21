import puppeteer from "puppeteer";
import { User } from "./jackpota/User/User";
import { completePostVerification, extractVerificationLink, fillRegistrationForm, navigateToVerificationPage } from "./jackpota/pages/signup";


const TARGET_URL = process.env.TARGET_URL ?? "https://www.jackpota.com/register";
const HEADLESS = (process.env.HEADLESS ?? "false").toLowerCase() === "true";
const BEFORE_PATH = process.env.SCREENSHOT_BEFORE ?? "jackpota-before-fill.png";
const AFTER_PATH = process.env.SCREENSHOT_AFTER ?? "jackpota-after-fill.png";

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    defaultViewport: { width: 1280, height: 720 },
  });

  try {
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10_000 });

    const beforePath = /\.(png|jpe?g|webp)$/i.test(BEFORE_PATH) ? BEFORE_PATH : `${BEFORE_PATH}.png`;
    await page.screenshot({ path: beforePath as `${string}.png` });

    // Build a user
    const user = new User();
    await user.initialize();
    console.log(user);

    // Example: Wait for a specific type of message (e.g., verification email)
    // const verificationMessage = await user.waitForMessage("verification", 60000);
    // if (verificationMessage) {
    //   console.log("Found verification message:", verificationMessage.subject);
    // }

    await fillRegistrationForm(page, user);

    // Wait for verification email and complete the process
    console.log("Waiting for verification email...");
    const emailMessage = await user.waitForMessage(undefined, 60000);

    if (!emailMessage) {
      console.log("No verification email received within timeout");
      return;
    }

    console.log(`Email received: "${emailMessage.subject}" from ${emailMessage.from}`);

    // Extract and navigate to verification link
    const verificationLink = extractVerificationLink(emailMessage.text);
    if (!verificationLink) {
      console.log("Could not extract verification link from email");
      return;
    }

    console.log("Verification link found, navigating...");
    const navigationSuccess = await navigateToVerificationPage(page, verificationLink);

    if (navigationSuccess) {
      console.log("Email verification process completed successfully!");

      // Complete the post-verification steps
      console.log("Completing post-verification steps...");
      const postVerificationSuccess = await completePostVerification(page);

      if (postVerificationSuccess) {
        console.log("Post-verification steps completed successfully!");
      } else {
        console.log("Failed to complete post-verification steps");
      }
    } else {
      console.log("Failed to complete email verification");
    }

    // Check inbox for any messages
    await user.fetchInboxMessages();
    // if (user.inbox.length > 0) {
    //   console.log("All inbox messages:", user.inbox);
    // }

    const afterPath = /\.(png|jpe?g|webp)$/i.test(AFTER_PATH) ? AFTER_PATH : `${AFTER_PATH}.png`;
    await page.screenshot({ path: afterPath as `${string}.png` });

    console.log("Form automation completed successfully!");
  } catch (err) {
    console.error("An error occurred:", err);
  } finally {
    if (HEADLESS) {
      await browser.close();
    }
  }
}

main().catch(console.error);
