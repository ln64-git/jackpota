import type { User } from "./User/User";

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
      } else {
        console.log("Terms checkbox not found");
      }
    } catch (e) {
      console.log("Error checking terms checkbox:", e);
    }
  } catch (e) {
    console.log("State dropdown not found or error occurred:", e);
  }

  // Submit the form
  try {
    console.log("Looking for submit button...");
    const submitButton = await page.$('button[data-testid="button-base"][type="submit"]');

    if (submitButton) {
      console.log("Found submit button, checking if it's enabled...");

      // Wait for the button to become enabled (max 10 seconds)
      let attempts = 0;
      const maxAttempts = 20; // 20 attempts * 500ms = 10 seconds

      while (attempts < maxAttempts) {
        const isDisabled = await page.evaluate((btn: any) => btn.disabled, submitButton);

        if (!isDisabled) {
          console.log("Button is now enabled, attempting to click...");
          break;
        }

        console.log(`Button still disabled, waiting... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }

      if (attempts >= maxAttempts) {
        console.log("Button remained disabled after 10 seconds, trying to click anyway...");
      }

      // Click the button
      await submitButton.click();
      console.log("Submit button clicked successfully!");

      // Wait for form submission to process
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log("Form submission completed!");
    } else {
      console.log("Submit button not found");
    }
  } catch (e) {
    console.log("Error submitting form:", e);
  }
}
