import { User } from "../User/User";
import puppeteer, { Page } from "puppeteer";

export async function signUpAndVerify(page: Page): Promise<boolean> {
  // Build a user
  const user = new User();
  await user.initialize();
  console.log("User ready:", { name: user.name, email: user.email });

  await fillRegistrationForm(page, user);

  const msg = await user.waitForMessage(undefined, 30_000);
  if (!msg) return console.warn("No verification email within 30s"), false;

  const link = extractVerificationLink(msg.text);
  if (!link) return console.warn("No verification link found in email"), false;

  const navigated = await navigateToVerificationPage(page, link);
  if (!navigated) return console.warn("Verification navigation failed"), false;

  const postOk = await completePostVerification(page);
  if (!postOk) return console.warn("Post-verification failed"), false;

  return true;
}

export async function fillRegistrationForm(page: any, user: User) {
  await page.type('input[type="email"], input[name="email"]', user.email);
  await page.type('input[type="password"], input[name="password"]', user.password);

  const [firstName = '', lastName = ''] = user.name.split(' ');
  await page.type('input[name="firstName"], input[name="first_name"], input[name="firstname"]', firstName);
  await page.type('input[name="lastName"], input[name="last_name"], input[name="lastname"]', lastName);

  try {
    const dobDate = new Date(user.dob);
    const month = dobDate.getMonth() + 1; // getMonth() returns 0-11
    const day = dobDate.getDate();
    const year = dobDate.getFullYear();

    // Month is a dropdown - try to find and select it
    const monthSelector = 'select[name="month"], select[name="dobMonth"], select[name="birthMonth"]';
    if (await page.$(monthSelector)) {
      await page.select(monthSelector, month.toString());
    }

    // Day is an input field - try to find and type into it
    const daySelector = 'input[name="day"], input[name="dobDay"], input[name="birthDay"], input[placeholder*="Day"], input[placeholder*="day"]';
    if (await page.$(daySelector)) {
      await page.type(daySelector, day.toString());
    }

    // Year is an input field - try to find and type into it
    const yearSelector = 'input[name="year"], input[name="dobYear"], input[name="birthYear"], input[placeholder*="Year"], input[placeholder*="year"]';
    if (await page.$(yearSelector)) {
      await page.type(yearSelector, year.toString());
    }
  } catch (e) {
    console.log("Date of birth fields not found or error occurred:", e);
  }

  // Handle state dropdown - the form has a state selector
  try {
    // Try multiple possible selectors for state
    const stateSelectors = [
      'select[name="state"]',
      'select[name="province"]',
      'select[name="region"]',
      'select[data-testid*="state"]',
      'select[id*="state"]'
    ];

    let stateSelector = null;
    for (const selector of stateSelectors) {
      if (await page.$(selector)) {
        stateSelector = selector;
        break;
      }
    }

    if (stateSelector) {
      // Find the option that contains our state name
      const stateOptions = await page.$$eval(`${stateSelector} option`, (options: any[]) =>
        options.map((opt: any) => ({ value: opt.value, text: opt.textContent }))
      );

      // Try to find exact match first, then partial match
      let selectedValue = null;
      for (const option of stateOptions) {
        if (option.text.toLowerCase().includes(user.location.toLowerCase()) ||
          option.value.toLowerCase().includes(user.location.toLowerCase())) {
          selectedValue = option.value;
          break;
        }
      }

      if (selectedValue) {
        await page.select(stateSelector, selectedValue);
      } else {
        console.log(`Could not find state option for: ${user.location}`);
        console.log(`User state: ${user.location}`);
        console.log(`Available options: ${stateOptions.map((opt: any) => `${opt.text} (${opt.value})`).join(', ')}`);
      }
    } else {
      console.log("No state selector found with any of the attempted selectors");
    }

    try {
      const termsCheckbox = await page.$('input[type="checkbox"], input[name="terms"], input[name="agreement"]');
      if (termsCheckbox) {
        await termsCheckbox.click();
      }
    } catch (e) {
      console.log("Error checking terms checkbox:", e);
    }
  } catch (e) {
    console.log("State dropdown not found or error occurred:", e);
  }

  // Submit the form
  try {
    const submitButton = await page.$('button[data-testid="button-base"][type="submit"]');
    if (submitButton) {

      // Wait for the button to become enabled (max 10 seconds)
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds

      while (attempts < maxAttempts) {
        const isDisabled = await page.evaluate((btn: any) => btn.disabled, submitButton);
        if (!isDisabled) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      // Click the button
      await submitButton.click();

      // Wait for form submission to process
      await new Promise(resolve => setTimeout(resolve, 2000));

    }
  } catch (e) {
    console.log("Error submitting form:", e);
  }
}


// Function to extract verification link from email content
export function extractVerificationLink(emailContent: string): string | null {
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
      return match[0];
    }
  }

  // If no specific pattern found, look for any URL that might be a verification link
  const urlPattern = /https?:\/\/[^\s<>"']+/g;
  const urls = emailContent.match(urlPattern);
  if (urls && urls.length > 0) {
    // Return the first URL found (often the verification link is the main link in the email)
    return urls[0];
  }
  return null;
}

// Function to navigate to verification page with retry logic
export async function navigateToVerificationPage(page: any, verificationLink: string): Promise<boolean> {
  const maxAttempts = 3;
  const retryDelay = 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await page.goto(verificationLink, {
        waitUntil: "domcontentloaded",
        timeout: 30000
      });
      if (response && response.ok()) {
        // Wait for page to fully load and take screenshot
        await new Promise(resolve => setTimeout(resolve, 3000));
        return true;
      } else {
        console.log(`Navigation failed with status: ${response?.status()}`);
      }
    } catch (error) {
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  console.log("Failed to navigate to verification page after maxAttempts");
  return false;
}

// Function to complete post-verification steps
export async function completePostVerification(page: any): Promise<boolean> {
  try {
    // Wait for page to stabilize
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Click the terms checkbox
    const checkbox = await page.$('input[type="checkbox"]');
    if (checkbox) {
      const isChecked = await page.evaluate((cb: any) => cb.checked, checkbox);
      if (!isChecked) {
        await checkbox.click();
      }
    }

    // Wait a bit more for any dynamic content to load
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Find and click the "Start Winning Now" button
    const allButtons = await page.$$('button');
    let submitButton = null;

    for (let i = 0; i < allButtons.length; i++) {
      const buttonText = await page.evaluate((btn: any) =>
        btn.textContent || 'No text', allButtons[i]
      );

      if (buttonText.toLowerCase().includes('start winning now')) {
        submitButton = allButtons[i];
        break;
      }
    }

    if (submitButton) {
      await submitButton.click();
      // Step 1: Handle the first popup (close it)
      const firstPopupClosed = await handleFirstPopup(page);
      if (!firstPopupClosed) {
        console.log("Failed to close first popup");
        return false;
      }
      // Step 2: Handle the second popup (click "Claim My Rewards")
      const secondPopupHandled = await handleSecondPopup(page);
      if (!secondPopupHandled) {
        console.log("Failed to handle second popup");
        return false;
      }

      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("Error completing post-verification steps:", error);
    return false;
  }
}

// Function to handle the first popup (close it)
export async function handleFirstPopup(page: any): Promise<boolean> {
  // Wait for the first modal to appear with retry logic
  let modalFound = false;
  let closeButton = null;
  const maxWaitAttempts = 10;
  const waitInterval = 500;

  for (let attempt = 1; attempt <= maxWaitAttempts; attempt++) {
    // Wait a bit before checking
    await new Promise(resolve => setTimeout(resolve, waitInterval));
    // Try to find a close button for the first popup
    closeButton = await findCloseButtonForFirstPopup(page);
    if (closeButton) {
      modalFound = true;
      break;
    }
  }

  if (modalFound && closeButton) {
    // Try to click the close button with retry logic
    const clickSuccess = await clickButtonWithRetry(page, closeButton, "first popup close button");
    if (clickSuccess) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

// Function to handle the second popup (click "Claim My Rewards")
export async function handleSecondPopup(page: any): Promise<boolean> {
  // Wait for the second modal to appear with retry logic
  let modalFound = false;
  let claimButton = null;
  const maxWaitAttempts = 10;
  const waitInterval = 500;

  for (let attempt = 1; attempt <= maxWaitAttempts; attempt++) {
    // Wait a bit before checking
    await new Promise(resolve => setTimeout(resolve, waitInterval));
    // Try to find the "Claim My Rewards" button
    claimButton = await findClaimRewardsButton(page);
    if (claimButton) {
      modalFound = true;
      break;
    }
  }

  if (modalFound && claimButton) {
    // Try to click the claim button with retry logic
    const clickSuccess = await clickButtonWithRetry(page, claimButton, "'Claim My Rewards' button");
    if (clickSuccess) {
      return true;
    } else {
      return false;
    }
  } else {
    return false;
  }
}

// Function to find close button for the first popup
export async function findCloseButtonForFirstPopup(page: any): Promise<any> {
  // Strategy 1: Look for buttons with specific text that indicate closing
  const allButtons = await page.$$('button');
  for (let i = 0; i < allButtons.length; i++) {
    const buttonText = await page.evaluate((btn: any) =>
      btn.textContent?.trim() || '', allButtons[i]
    );

    if (buttonText.toLowerCase().includes('no, thanks') ||
      buttonText.toLowerCase().includes('no thanks') ||
      buttonText.toLowerCase().includes('decline') ||
      buttonText.toLowerCase().includes('close') ||
      buttonText.toLowerCase().includes('get coins') ||
      buttonText === '×' || buttonText === 'X' || buttonText === '✕') {
      return allButtons[i];
    }
  }

  // Strategy 2: Look for close buttons with aria-labels
  const closeButton = await page.$('button[aria-label*="close"], button[aria-label*="Close"], button[aria-label*="Close modal"]');
  if (closeButton) {
    return closeButton;
  }

  // Strategy 3: Look for buttons with specific classes
  const classButton = await page.$('.close-button, .modal-close, .btn-close, .close');
  if (classButton) {
    return classButton;
  }

  return null;
}

// Function to find the "Claim My Rewards" button
export async function findClaimRewardsButton(page: any): Promise<any> {
  const allButtons = await page.$$('button');

  for (let i = 0; i < allButtons.length; i++) {
    const buttonText = await page.evaluate((btn: any) =>
      btn.textContent?.trim() || '', allButtons[i]
    );

    if (buttonText.toLowerCase().includes('claim my rewards') ||
      buttonText.toLowerCase().includes('claim rewards') ||
      buttonText.toLowerCase().includes('claim') ||
      buttonText.toLowerCase().includes('get rewards')) {
      return allButtons[i];
    }
  }

  return null;
}

// Generic function to click a button with retry logic
export async function clickButtonWithRetry(page: any, button: any, buttonDescription: string): Promise<boolean> {
  const maxClickAttempts = 5;

  for (let attempt = 1; attempt <= maxClickAttempts; attempt++) {
    try {

      // Check if button is visible and clickable
      const isVisible = await page.evaluate((btn: any) => {
        const rect = btn.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      }, button);

      if (!isVisible) {
        await new Promise(resolve => setTimeout(resolve, 500));
        continue;
      }

      // Try to enable the button if it appears disabled
      await page.evaluate((btn: any) => {
        btn.disabled = false;
        btn.removeAttribute('aria-disabled');
        btn.classList.remove('disabled');
        btn.style.pointerEvents = 'auto';
        btn.style.opacity = '1';
      }, button);

      // Scroll button into view
      await button.scrollIntoView();

      // Wait a moment for any animations
      await new Promise(resolve => setTimeout(resolve, 200));

      // Click the button
      await button.click();

      // Wait to see if the modal closes or action completes
      await new Promise(resolve => setTimeout(resolve, 1000));

      // For the first popup, check if it closed
      if (buttonDescription.includes("first popup")) {
        const buttonStillVisible = await page.evaluate((btn: any) => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0;
        }, button);

        if (!buttonStillVisible) {
          return true;
        }
      } else {
        return true;
      }

    } catch (error) {
      console.log(`Click attempt ${attempt} failed:`, error);
      if (attempt < maxClickAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }

  console.log(`Failed to click ${buttonDescription} after all attempts`);
  return false;
}