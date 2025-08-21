import puppeteer from "puppeteer";
import { fillRegistrationForm } from "./jackpota/jackpota";
import { User } from "./jackpota/User/User";

// Function to extract verification link from email content
function extractVerificationLink(emailContent: string): string | null {
  console.log("Extracting verification link from email content...");
  console.log("Email content length:", emailContent.length);

  // Common patterns for verification links
  const linkPatterns = [
    /https?:\/\/[^\s<>"']*verify[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*confirm[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*activation[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*activate[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*email[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*token[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*link[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*account[^\s<>"']*/i,
    /https?:\/\/[^\s<>"']*sign[^\s<>"']*/i
  ];

  for (const pattern of linkPatterns) {
    const match = emailContent.match(pattern);
    if (match) {
      console.log("Found verification link with pattern:", pattern.source);
      return match[0];
    }
  }

  // If no specific pattern found, look for any URL that might be a verification link
  const urlPattern = /https?:\/\/[^\s<>"']+/g;
  const urls = emailContent.match(urlPattern);

  if (urls && urls.length > 0) {
    console.log("Found URLs in email:", urls);
    // Return the first URL found (often the verification link is the main link in the email)
    return urls[0];
  }

  console.log("No URLs found in email content");
  return null;
}

// Function to navigate to verification page with retry logic
async function navigateToVerificationPage(page: any, verificationLink: string): Promise<boolean> {
  const maxAttempts = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`Navigation attempt ${attempt}/${maxAttempts}...`);

      const response = await page.goto(verificationLink, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });

      if (response && response.ok()) {
        console.log("Successfully navigated to verification page");

        // Wait for page to fully load and take screenshot
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.screenshot({ path: "jackpota-verification-page.png" });
        console.log("Verification page screenshot saved");

        return true;
      } else {
        console.log(`Navigation failed with status: ${response?.status()}`);
      }

    } catch (error) {
      console.log(`Navigation attempt ${attempt} failed:`, error);

      if (attempt < maxAttempts) {
        console.log(`Waiting ${retryDelay / 1000} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.log("Failed to navigate to verification page after all attempts");
  return false;
}

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
