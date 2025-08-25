import type { Page } from "puppeteer";

export async function playSpinAWin(page: Page) {
  await page.goto("https://www.jackpota.com/games/live-dealer/spin-a-win", { waitUntil: "domcontentloaded" });

  // Wait for the page to load and check for popup
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Try to dismiss the welcome offer popup
  const popupDismissed = await dismissWelcomePopup(page);
  if (!popupDismissed) {
    console.log("Failed to dismiss welcome popup, continuing anyway...");
  }

  // Wait for the page to load and look for available buttons
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Log available buttons to debug
  const availableButtons = await page.$$('button');
  console.log(`Found ${availableButtons.length} buttons on the page`);

  for (let i = 0; i < Math.min(availableButtons.length, 10); i++) {
    try {
      const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', availableButtons[i]);
      const buttonTestId = await page.evaluate((btn: any) => btn.getAttribute('data-testid') || '', availableButtons[i]);
      console.log(`Button ${i}: text="${buttonText}", testid="${buttonTestId}"`);
    } catch (e) {
      console.log(`Button ${i}: error reading`);
    }
  }

  // Try to find the spin button or any game-related button
  let spinButton = await page.$('button[data-testid="spin-button"]');
  if (!spinButton) {
    // Look for buttons with "Spin" or "Play" text
    const allButtons = await page.$$('button');
    for (const button of allButtons) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
        if (buttonText.toLowerCase().includes('spin') || buttonText.toLowerCase().includes('play')) {
          spinButton = button;
          console.log(`Found button with text: "${buttonText}"`);
          break;
        }
      } catch (e) {
        // Continue to next button
      }
    }
  }

  if (spinButton) {
    console.log("Found spin/play button");
  } else {
    console.log("No spin button found, continuing...");
  }

  // Click on the "Play with Sweepstakes Coins" button
  console.log("Looking for Play with Sweepstakes Coins button...");

  // Find the button with "Play with Sweepstakes Coins" text
  let sweepstakesButton = null;
  const allButtons = await page.$$('button');

  for (const button of allButtons) {
    try {
      const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
      if (buttonText.toLowerCase().includes('sweepstakes coins') || buttonText.toLowerCase().includes('play with sweepstakes')) {
        sweepstakesButton = button;
        console.log(`Found Play with Sweepstakes Coins button: "${buttonText}"`);
        break;
      }
    } catch (e) {
      // Continue to next button
    }
  }

  if (sweepstakesButton) {
    console.log("Clicking Play with Sweepstakes Coins button...");
    await sweepstakesButton.click();
  } else {
    console.log("Could not find Play with Sweepstakes Coins button");
  }

  // Wait a moment for the action to complete
  await new Promise(resolve => setTimeout(resolve, 1000));
}

async function dismissWelcomePopup(page: Page): Promise<boolean> {
  try {
    // Wait a bit for the popup to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Look for the close button (X) on the welcome offer popup
    // Try multiple strategies to find the close button

    // Strategy 1: Look for buttons with X or close text
    const closeButtons = await page.$$('button');
    for (const button of closeButtons) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
        if (buttonText === '×' || buttonText === 'X' || buttonText === '✕' || buttonText === 'Close') {
          await button.click();
          console.log("Clicked close button with text:", buttonText);
          return true;
        }
      } catch (e) {
        // Continue to next button
      }
    }

    // Strategy 2: Look for close buttons with specific attributes
    const closeButtonByAttr = await page.$('button[aria-label*="close"], button[aria-label*="Close"], button[data-testid*="close"], button[class*="close"]');
    if (closeButtonByAttr) {
      await closeButtonByAttr.click();
      console.log("Clicked close button by attributes");
      return true;
    }

    // Strategy 3: Look for the specific welcome offer popup structure
    const welcomePopup = await page.$('[class*="welcome"], [class*="offer"], [class*="popup"], [class*="modal"]');
    if (welcomePopup) {
      // Look for close button within the popup
      const popupButtons = await welcomePopup.$$('button');
      for (const button of popupButtons) {
        try {
          const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
          if (buttonText === '×' || buttonText === 'X' || buttonText === '✕') {
            await button.click();
            console.log("Clicked close button within welcome popup");
            return true;
          }
        } catch (e) {
          // Continue to next button
        }
      }
    }

    // Strategy 4: Try clicking on common close button positions
    // Look for buttons in the top-right area of the popup
    const allButtons = await page.$$('button');
    for (const button of allButtons) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
        if (buttonText === '×' || buttonText === 'X' || buttonText === '✕') {
          await button.click();
          console.log("Clicked close button by text content");
          return true;
        }
      } catch (e) {
        // Continue to next button
      }
    }

    // Strategy 5: Try to find and click the close button by looking at the page structure
    // Look for elements that might be the close button
    const closeElements = await page.$$('[class*="close"], [class*="dismiss"], [class*="exit"]');
    for (const element of closeElements) {
      try {
        if (await page.evaluate((el: any) => el.tagName === 'BUTTON' || el.onclick, element)) {
          await element.click();
          console.log("Clicked close element by class");
          return true;
        }
      } catch (e) {
        // Continue to next element
      }
    }

    console.log("Could not find welcome popup close button");
    return false;

  } catch (error) {
    console.log("Error dismissing welcome popup:", error);
    return false;
  }
}