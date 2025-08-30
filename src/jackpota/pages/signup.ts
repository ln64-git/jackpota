import { User } from "../User/User";
import { Page } from "puppeteer";

export async function signUpAndVerify(page: Page): Promise<boolean> {
  // Build a user
  const user = new User();
  await user.initialize();
  console.log("User ready:", { name: user.name, email: user.email });

  const formResult = await fillRegistrationForm(page, user);
  if (formResult === "error") {
    console.warn("Failed to fill registration form");
    return false;
  }

  // Check if we already completed the process by clicking "Play Now" immediately
  if (formResult === "completed") {
    console.log("Registration and 'Play Now' button click completed successfully!");
    return true;
  }

  console.log("Registration form filled successfully, waiting for verification email...");

  // Wait for verification email with longer timeout
  const msg = await user.waitForMessage(undefined, 60_000); // Increased to 60 seconds

  if (!msg) {
    console.warn("No verification email within 60s - website may have changed");
    console.log("Attempting to continue without email verification...");

    // Try to find and click the "Start Winning Now" button directly
    const postOk = await completePostVerification(page);
    if (postOk) {
      console.log("Successfully completed post-verification without email");
      return true;
    } else {
      console.warn("Failed to complete post-verification without email");
      return false;
    }
  }

  const link = extractVerificationLink(msg.text);
  if (!link) {
    console.warn("No verification link found in email");
    console.log("Attempting to continue without verification link...");

    // Try to find and click the "Start Winning Now" button directly
    const postOk = await completePostVerification(page);
    if (postOk) {
      console.log("Successfully completed post-verification without verification link");
      return true;
    } else {
      console.warn("Failed to complete post-verification without verification link");
      return false;
    }
  }

  const navigated = await navigateToVerificationPage(page, link);
  if (!navigated) {
    console.warn("Verification navigation failed");
    console.log("Attempting to continue without verification navigation...");

    // Try to find and click the "Start Winning Now" button directly
    const postOk = await completePostVerification(page);
    if (postOk) {
      console.log("Successfully completed post-verification without navigation");
      return true;
    } else {
      console.warn("Failed to complete post-verification without navigation");
      return false;
    }
  }

  const postOk = await completePostVerification(page);
  if (!postOk) return console.warn("Post-verification failed"), false;

  return true;
}

export async function fillRegistrationForm(page: any, user: User): Promise<string> {
  try {
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
        console.log("Form submitted, waiting for page to update...");

        // Wait for form submission to process
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Take a screenshot to see what the page looks like after form submission
        try {
          await page.screenshot({ path: "after-form-submission.png" });
          console.log("Screenshot saved as after-form-submission.png");
        } catch (e) {
          console.log("Could not take screenshot:", e);
        }

        // Check if the "Play Now" button appears immediately after form submission
        const playNowButton = await findPlayNowButton(page);
        if (playNowButton) {
          console.log("Found 'Play Now' button immediately after form submission!");
          await playNowButton.click();
          console.log("Clicked 'Play Now' button successfully!");

          // Wait for any popups or modals to appear
          await new Promise(resolve => setTimeout(resolve, 3000));

          // Handle any popups that might appear
          const firstPopupClosed = await handleFirstPopup(page);
          if (firstPopupClosed) {
            console.log("First popup handled successfully");
          }

          const secondPopupHandled = await handleSecondPopup(page);
          if (secondPopupHandled) {
            console.log("Second popup handled successfully");
          }

          return "completed"; // Special return value to indicate completion
        } else {
          console.log("No 'Play Now' button found immediately after form submission, continuing with email verification flow...");
          return "form_filled"; // Indicate form was filled but button not found
        }
      } else {
        // If no submit button found, try to find and click the "Play Now" button directly
        console.log("No submit button found, looking for 'Play Now' button directly...");

        // Wait a moment for the page to stabilize
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Take a screenshot to see the current state
        try {
          await page.screenshot({ path: "looking-for-play-now.png" });
          console.log("Screenshot saved as looking-for-play-now.png");
        } catch (e) {
          console.log("Could not take screenshot:", e);
        }

        // Try to find the "Play Now" button with a simple approach
        const allButtons = await page.$$('button');
        console.log(`Found ${allButtons.length} buttons on the page`);

        let playNowButton = null;
        for (let i = 0; i < allButtons.length; i++) {
          try {
            const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', allButtons[i]);
            console.log(`Button ${i}: "${buttonText}"`);

            if (buttonText.toLowerCase() === 'play now') {
              console.log(`Found 'Play Now' button at index ${i}!`);
              playNowButton = allButtons[i];
              break;
            }
          } catch (e) {
            console.log(`Error reading button ${i}:`, e);
          }
        }

        if (playNowButton) {
          console.log("Clicking 'Play Now' button...");
          await playNowButton.click();
          console.log("Successfully clicked 'Play Now' button!");

          // Wait for any navigation or popups
          await new Promise(resolve => setTimeout(resolve, 3000));

          return "completed";
        } else {
          console.log("No 'Play Now' button found, continuing with email verification flow...");
          return "form_filled";
        }
      }
    } catch (e) {
      console.log("Error submitting form:", e);
      return "error";
    }

    return "form_filled";
  } catch (error) {
    console.log("Error filling registration form:", error);
    return "error";
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

// Function to check if we're already on a page with the "Start Winning Now" button
export async function checkIfAlreadyOnPostVerificationPage(page: any): Promise<boolean> {
  try {
    // Wait for page to load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Look for buttons that indicate we're on the post-verification page
    const allButtons = await page.$$('button');
    const buttonTexts = [];

    for (let i = 0; i < Math.min(allButtons.length, 20); i++) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', allButtons[i]);
        buttonTexts.push(buttonText.toLowerCase());
      } catch (e) {
        // Continue to next button
      }
    }

    // Check if any button text suggests we're on the post-verification page
    const postVerificationIndicators = [
      'start winning now',
      'start winning',
      'play now',
      'play',
      'continue',
      'get started',
      'begin',
      'start'
    ];

    for (const indicator of postVerificationIndicators) {
      if (buttonTexts.some(text => text.includes(indicator))) {
        console.log(`Found post-verification indicator: "${indicator}"`);
        return true;
      }
    }

    return false;
  } catch (error) {
    console.log("Error checking if on post-verification page:", error);
    return false;
  }
}

// Function to find the "Play Now" button
async function findPlayNowButton(page: any): Promise<any> {
  try {
    console.log("Searching for 'Play Now' button...");

    // Wait a bit more for the page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Take a screenshot to see what the page looks like
    try {
      await page.screenshot({ path: "searching-for-button.png" });
      console.log("Screenshot saved as searching-for-button.png");
    } catch (e) {
      console.log("Could not take screenshot:", e);
    }

    // Strategy 1: Look for button with exact text "Play Now" using page.evaluate
    const allButtons = await page.$$('button');
    console.log(`Found ${allButtons.length} buttons on the page`);

    // Log all button texts for debugging
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', allButtons[i]);
        const buttonVisible = await page.evaluate((btn: any) => {
          const rect = btn.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && btn.offsetParent !== null;
        }, allButtons[i]);

        console.log(`Button ${i}: text="${buttonText}", visible=${buttonVisible}`);

        if (buttonText.toLowerCase() === 'play now' && buttonVisible) {
          console.log(`Found 'Play Now' button at index ${i} with text: "${buttonText}"`);
          return allButtons[i];
        }
      } catch (e) {
        console.log(`Error reading button ${i}:`, e);
      }
    }

    // Strategy 2: Look for buttons with specific attributes that might indicate "Play Now"
    const buttonByAttr = await page.$('button[data-testid*="play"], button[data-testid*="submit"], button[class*="play"], button[class*="submit"]');
    if (buttonByAttr) {
      const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', buttonByAttr);
      console.log(`Found button by attributes with text: "${buttonText}"`);
      if (buttonText.toLowerCase().includes('play') || buttonText.toLowerCase().includes('submit')) {
        return buttonByAttr;
      }
    }

    // Strategy 3: Look for any button that might be the submit button
    const submitButtons = await page.$$('button[type="submit"], button[data-testid*="button"], button[class*="btn"]');
    for (const button of submitButtons) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', button);
        console.log(`Submit button candidate: "${buttonText}"`);
        if (buttonText.toLowerCase().includes('play') || buttonText.toLowerCase().includes('now') || buttonText.toLowerCase().includes('submit')) {
          console.log(`Found submit button with text: "${buttonText}"`);
          return button;
        }
      } catch (e) {
        // Continue to next button
      }
    }

    // Strategy 4: Look for any button with "play" or "now" in the text (case insensitive)
    for (let i = 0; i < allButtons.length; i++) {
      try {
        const buttonText = await page.evaluate((btn: any) => btn.textContent?.trim() || '', allButtons[i]);
        if (buttonText.toLowerCase().includes('play') || buttonText.toLowerCase().includes('now')) {
          console.log(`Found button with 'play' or 'now' in text: "${buttonText}"`);
          return allButtons[i];
        }
      } catch (e) {
        // Continue to next button
      }
    }

    // Strategy 5: Look for the button by examining the page HTML more directly
    try {
      const pageContent = await page.content();
      console.log("Page HTML length:", pageContent.length);

      // Look for buttons in the HTML that might contain "Play Now"
      const buttonMatches = pageContent.match(/<button[^>]*>.*?Play Now.*?<\/button>/gi);
      if (buttonMatches) {
        console.log("Found button HTML matches:", buttonMatches);
      }

      // Try to find by more specific selectors
      const specificButton = await page.$('button:contains("Play Now"), button:contains("play now"), button:contains("Play"), button:contains("play")');
      if (specificButton) {
        console.log("Found button using :contains selector");
        return specificButton;
      }
    } catch (e) {
      console.log("Error examining page HTML:", e);
    }

    // Strategy 6: Try to find by looking at all elements, not just buttons
    try {
      const allElements = await page.$$('*');
      console.log(`Found ${allElements.length} total elements on the page`);

      for (let i = 0; i < Math.min(allElements.length, 100); i++) {
        try {
          const tagName = await page.evaluate((el: any) => el.tagName?.toLowerCase() || '', allElements[i]);
          const textContent = await page.evaluate((el: any) => el.textContent?.trim() || '', allElements[i]);

          if (tagName === 'button' && textContent.toLowerCase().includes('play now')) {
            console.log(`Found button element at index ${i} with text: "${textContent}"`);
            return allElements[i];
          }
        } catch (e) {
          // Continue to next element
        }
      }
    } catch (e) {
      console.log("Error examining all elements:", e);
    }

    console.log("No 'Play Now' button found with any strategy");
    return null;
  } catch (error) {
    console.log("Error finding Play Now button:", error);
    return null;
  }
}