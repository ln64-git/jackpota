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

// Function to complete post-verification steps
async function completePostVerification(page: any): Promise<boolean> {
  try {
    console.log("Completing post-verification steps...");

    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Click the terms checkbox
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      const isChecked = await page.evaluate((cb: any) => cb.checked, checkbox);
      if (!isChecked) {
        await checkbox.click();
        console.log("Terms checkbox clicked");
      }
    }

    // Check if there's a notification modal with "No, Thanks" button and dismiss it first
    console.log("Checking for notification modal...");
    const notificationButtons = await page.$$('button');
    let notificationDeclineButton = null;

    for (let i = 0; i < notificationButtons.length; i++) {
      const buttonText = await page.evaluate((btn: any) =>
        btn.textContent?.trim() || '', notificationButtons[i]
      );

      if (buttonText.toLowerCase().includes('no, thanks') ||
        buttonText.toLowerCase().includes('no thanks')) {
        notificationDeclineButton = notificationButtons[i];
        console.log(`Found notification modal "No, Thanks" button: "${buttonText}"`);
        break;
      }
    }

    if (notificationDeclineButton) {
      console.log("Dismissing notification modal...");
      await notificationDeclineButton.click();
      console.log("Notification modal dismissed");

      // Wait for the modal to close
      await new Promise(resolve => setTimeout(resolve, 1000));
    } else {
      console.log("No notification modal found");
    }

    // Find and click the "Start Winning Now" button
    const allButtons = await page.$$('button');
    let submitButton = null;

    for (let i = 0; i < allButtons.length; i++) {
      const buttonText = await page.evaluate((btn: any) =>
        btn.textContent || 'No text', allButtons[i]
      );

      if (buttonText.toLowerCase().includes('start winning now')) {
        submitButton = allButtons[i];
        console.log(`Found 'Start Winning Now' button`);
        break;
      }
    }

    if (submitButton) {
      await submitButton.click();
      console.log("'Start Winning Now' button clicked");

      // Wait for the decline button to appear
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Look for and click the "No, Thanks" button
      try {
        // Wait for the modal to appear and then look for the close button
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Try multiple selectors to find the "No, Thanks" button
        let declineButton = null;

        // First try looking for any button with "No, Thanks" text (this is the notification modal)
        const allButtons = await page.$$('button');
        for (let i = 0; i < allButtons.length; i++) {
          const buttonText = await page.evaluate((btn: any) =>
            btn.textContent?.trim() || '', allButtons[i]
          );

          if (buttonText.toLowerCase().includes('no, thanks') ||
            buttonText.toLowerCase().includes('no thanks') ||
            buttonText.toLowerCase().includes('decline')) {
            declineButton = allButtons[i];
            console.log(`Found "No, Thanks" button with text: "${buttonText}"`);
            break;
          }
        }

        // If not found, try looking for any close button or X button
        if (!declineButton) {
          declineButton = await page.$('button[aria-label*="close"], button[aria-label*="Close"], .close-button, .modal-close, [data-test*="close"]');
          if (declineButton) {
            console.log("Found close button with aria-label or class selector");
          }
        }

        // If still not found, try the data-test selector as last resort
        if (!declineButton) {
          declineButton = await page.$('[data-test="close-modal-button"]');
          if (declineButton) {
            console.log("Found button with data-test selector");
          }
        }

        if (declineButton) {
          // Check if button is disabled and try to enable it
          const isDisabled = await page.evaluate((btn: any) => {
            return btn.disabled || btn.getAttribute('aria-disabled') === 'true' ||
              btn.classList.contains('disabled') || btn.style.pointerEvents === 'none';
          }, declineButton);

          if (isDisabled) {
            console.log("Button appears disabled, enabling it...");
            await page.evaluate((btn: any) => {
              btn.disabled = false;
              btn.removeAttribute('aria-disabled');
              btn.classList.remove('disabled');
              btn.style.pointerEvents = 'auto';
            }, declineButton);
          }

          // Click the button
          await declineButton.click();
          console.log("'No, Thanks' button clicked successfully");

          // Wait for modal to close
          await new Promise(resolve => setTimeout(resolve, 500));
        } else {
          console.log("'No, Thanks' button not found");
        }
      } catch (error) {
        console.log("Error clicking decline button:", error);
      }

      // Wait and take final screenshot
      await new Promise(resolve => setTimeout(resolve, 1000));
      await page.screenshot({ path: "jackpota-final-state.png" });
      console.log("Final state screenshot saved");

      return true;
    } else {
      console.log("'Start Winning Now' button not found");
      return false;
    }

  } catch (error) {
    console.log("Error completing post-verification steps:", error);
    return false;
  }
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
