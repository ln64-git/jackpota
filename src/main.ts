import puppeteer from 'puppeteer';

// Interface for random user data
interface RandomUser {
  name: {
    first: string;
    last: string;
  };
  email: string;
  dob: {
    date: string;
  };
  location: {
    state: string;
  };
}

// US States array for dropdown selection
const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
];

// Interface for geolocation response
interface GeolocationResponse {
  country: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
}

// Function to get user's location based on network/IP
async function getUserLocation(): Promise<string> {
  try {
    console.log('Detecting network location...');

    // Try ipapi.co first (free and reliable)
    let response = await fetch('http://ipapi.co/json/');
    let data = await response.json() as GeolocationResponse;

    if (data.country === 'US' && data.region) {
      console.log(`Detected location: ${data.city}, ${data.region}`);

      // Map common region abbreviations to full state names
      const stateMapping: { [key: string]: string } = {
        'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
        'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
        'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
        'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
        'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
        'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
        'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
        'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
        'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
        'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
        'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
        'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
        'WI': 'Wisconsin', 'WY': 'Wyoming'
      };

      // Check if it's an abbreviation and convert to full name
      const fullStateName = stateMapping[data.region] || data.region;

      // Verify the state is in our US_STATES array
      if (US_STATES.includes(fullStateName)) {
        return fullStateName;
      }
    }

    // Fallback: try a different geolocation service
    try {
      response = await fetch('https://ipinfo.io/json');
      data = await response.json() as any;

      if (data.country === 'US' && data.region) {
        const stateMapping: { [key: string]: string } = {
          'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas',
          'CA': 'California', 'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware',
          'FL': 'Florida', 'GA': 'Georgia', 'HI': 'Hawaii', 'ID': 'Idaho',
          'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa', 'KS': 'Kansas',
          'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
          'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi',
          'MO': 'Missouri', 'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada',
          'NH': 'New Hampshire', 'NJ': 'New Jersey', 'NM': 'New Mexico', 'NY': 'New York',
          'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio', 'OK': 'Oklahoma',
          'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
          'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah',
          'VT': 'Vermont', 'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia',
          'WI': 'Wisconsin', 'WY': 'Wyoming'
        };

        const fullStateName = stateMapping[data.region] || data.region;
        if (US_STATES.includes(fullStateName)) {
          console.log(`Detected location (fallback): ${data.city}, ${fullStateName}`);
          return fullStateName;
        }
      }
    } catch (fallbackError) {
      console.log('Fallback geolocation service failed:', fallbackError);
    }

  } catch (error) {
    console.log('Error detecting location:', error);
  }

  // Ultimate fallback: return a random US state
  const randomState = US_STATES[Math.floor(Math.random() * US_STATES.length)];
  console.log(`Using random state as fallback: ${randomState}`);
  return randomState;
}

// Function to fetch random user data
async function fetchRandomUser(): Promise<RandomUser> {
  try {
    // Get user's actual location for state selection
    const detectedState = await getUserLocation();

    // Fetch multiple users to find one that meets our criteria
    const response = await fetch('https://randomuser.me/api/?nat=us&results=10');
    const data = await response.json() as { results: RandomUser[] };

    // Find a user that's over 21
    for (const user of data.results) {
      const birthDate = new Date(user.dob.date);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      const monthDiff = new Date().getMonth() - birthDate.getMonth();

      // Check if they're over 21 (accounting for month/day)
      if (age > 21 || (age === 21 && monthDiff > 0) || (age === 21 && monthDiff === 0 && new Date().getDate() >= birthDate.getDate())) {
        // Override the user's location with detected location
        user.location.state = detectedState;
        console.log(`Using API user with detected location: ${detectedState}`);
        return user;
      }
    }

    // If no suitable user found, generate one manually
    console.log("No suitable user found in API results, generating manual user...");
    return await generateManualUser();

  } catch (error) {
    console.error('Error fetching random user:', error);
    // Fallback data if API fails
    return await generateManualUser();
  }
}

// Function to generate a manual user that's guaranteed to be over 21 and from US
async function generateManualUser(): Promise<RandomUser> {
  const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Emily', 'Robert', 'Lisa', 'James', 'Jennifer'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

  // Generate random date between 1960-2002 (ensuring over 21)
  const startYear = 1960;
  const endYear = 2002;
  const year = Math.floor(Math.random() * (endYear - startYear + 1)) + startYear;
  const month = Math.floor(Math.random() * 12) + 1;
  const day = Math.floor(Math.random() * 28) + 1; // Using 28 to avoid month/day issues

  // Get user's actual location instead of random state
  const detectedState = await getUserLocation();

  return {
    name: {
      first: firstNames[Math.floor(Math.random() * firstNames.length)],
      last: lastNames[Math.floor(Math.random() * lastNames.length)]
    },
    email: 'user@example.com', // Placeholder, will be handled later
    dob: { date: `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}` },
    location: { state: detectedState }
  };
}

// Function to fill out the registration form
async function fillRegistrationForm(page: any, userData: RandomUser) {
  console.log('Filling out registration form with random data...');

  try {
    // Wait for form to be fully loaded
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });

    // Fill in the form fields
    // Note: We'll skip email for now as requested
    console.log('Filling first name:', userData.name.first);
    await page.type('input[placeholder*="First Name"], input[name*="firstName"]', userData.name.first);

    console.log('Filling last name:', userData.name.last);
    await page.type('input[placeholder*="Last Name"], input[name*="lastName"]', userData.name.last);

    // Generate a random password (8-20 chars, at least one number & uppercase)
    const password = generateRandomPassword();
    console.log('Filling password:', password);
    await page.type('input[type="password"], input[name*="password"]', password);

    // Handle date of birth
    const dob = new Date(userData.dob.date);
    const month = (dob.getMonth() + 1).toString().padStart(2, '0');
    const day = dob.getDate().toString().padStart(2, '0');
    const year = dob.getFullYear().toString();

    console.log('Setting date of birth:', `${month}/${day}/${year}`);

    // Try to fill date fields - adjust selectors based on actual page structure
    try {
      console.log('Attempting to fill date of birth dropdowns...');

      // Wait a bit for dropdowns to be fully loaded
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Get all select elements on the page
      const allSelects = await page.$$('select');
      console.log(`Found ${allSelects.length} select elements on the page`);

      // Debug: Let's see what elements are actually on the page
      const pageContent = await page.content();
      console.log('Page HTML contains date-related elements:');
      console.log('- Month dropdowns:', (pageContent.match(/month/gi) || []).length);
      console.log('- Day dropdowns:', (pageContent.match(/day/gi) || []).length);
      console.log('- Year dropdowns:', (pageContent.match(/year/gi) || []).length);
      console.log('- Select elements:', (pageContent.match(/<select/gi) || []).length);

      // Also check for any input elements that might be date-related
      const dateInputs = await page.$$('input[type="date"], input[placeholder*="date"], input[name*="date"]');
      console.log(`Found ${dateInputs.length} date input elements`);

      // Look for any elements with date-related attributes or content
      const allInputs = await page.$$('input');
      console.log(`Total input elements: ${allInputs.length}`);

      // Check each input element for date-related attributes
      for (let i = 0; i < allInputs.length; i++) {
        const input = allInputs[i];
        const placeholder = await input.getProperty('placeholder');
        const name = await input.getProperty('name');
        const type = await input.getProperty('type');
        const placeholderValue = await placeholder?.jsonValue();
        const nameValue = await name?.jsonValue();
        const typeValue = await type?.jsonValue();

        if (placeholderValue || nameValue || typeValue) {
          console.log(`Input ${i}: placeholder="${placeholderValue}", name="${nameValue}", type="${typeValue}"`);
        }
      }

      // Also check for any div or span elements that might contain date dropdowns
      const dateDivs = await page.$$('div[class*="date"], div[class*="month"], div[class*="day"], div[class*="year"]');
      console.log(`Found ${dateDivs.length} date-related div elements`);

      // Now I understand! The date fields are input fields, not dropdowns
      console.log('Date fields are input fields, not dropdowns. Attempting to fill them...');

      try {
        // Fill the day input field
        const dayInput = await page.$('input[name="day"]');
        if (dayInput) {
          await dayInput.click();
          await dayInput.type(day);
          console.log('Set day:', day);
        } else {
          console.log('Day input not found');
        }

        // Fill the year input field
        const yearInput = await page.$('input[name="year"]');
        if (yearInput) {
          await yearInput.click();
          await yearInput.type(year);
          console.log('Set year:', year);
        } else {
          console.log('Year input not found');
        }

        // Look for month input - it might have a different name or be hidden
        const monthInput = await page.$('input[name*="month"], input[placeholder*="Month"], input[placeholder*="month"]');
        if (monthInput) {
          await monthInput.click();
          await monthInput.type(month);
          console.log('Set month:', month);
        } else {
          console.log('Month input not found - might be a dropdown or have different selector');

          // Try to find month in the remaining select elements
          if (allSelects.length > 0) {
            try {
              // Try the first select element for month
              await page.select('select:nth-of-type(1)', month);
              console.log('Set month using first select:', month);
            } catch (e) {
              console.log('Failed to set month using first select:', e);
            }
          }
        }

      } catch (e) {
        console.log('Error filling date input fields:', e);
      }

    } catch (e) {
      console.log('Could not set date of birth automatically, manual input required:', e);
    }

    // Handle state selection based on network location
    try {
      const stateToSelect = userData.location.state;
      console.log(`Attempting to select detected state: ${stateToSelect}`);

      // First, let's inspect the state dropdown to see what options are available
      const stateDropdown = await page.$('select');
      if (stateDropdown) {
        const options = await stateDropdown.$$eval('option', (opts: any[]) =>
          opts.map((opt: any) => ({ value: opt.value, text: opt.textContent }))
        );
        console.log('Available state options:', options);

        // Try different approaches to find the right value
        let valueToUse = null;

        // Method 1: Try exact match with full state name
        const exactMatch = options.find((opt: any) => opt.text === stateToSelect || opt.value === stateToSelect);
        if (exactMatch) {
          valueToUse = exactMatch.value;
          console.log(`Found exact match: ${valueToUse}`);
        } else {
          // Method 2: Try state abbreviation
          const stateAbbreviations: { [key: string]: string } = {
            'Alabama': 'AL', 'Alaska': 'AK', 'Arizona': 'AZ', 'Arkansas': 'AR',
            'California': 'CA', 'Colorado': 'CO', 'Connecticut': 'CT', 'Delaware': 'DE',
            'Florida': 'FL', 'Georgia': 'GA', 'Hawaii': 'HI', 'Idaho': 'ID',
            'Illinois': 'IL', 'Indiana': 'IN', 'Iowa': 'IA', 'Kansas': 'KS',
            'Kentucky': 'KY', 'Louisiana': 'LA', 'Maine': 'ME', 'Maryland': 'MD',
            'Massachusetts': 'MA', 'Michigan': 'MI', 'Minnesota': 'MN', 'Mississippi': 'MS',
            'Missouri': 'MO', 'Montana': 'MT', 'Nebraska': 'NE', 'Nevada': 'NV',
            'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
            'North Carolina': 'NC', 'North Dakota': 'ND', 'Ohio': 'OH', 'Oklahoma': 'OK',
            'Oregon': 'OR', 'Pennsylvania': 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC',
            'South Dakota': 'SD', 'Tennessee': 'TN', 'Texas': 'TX', 'Utah': 'UT',
            'Vermont': 'VT', 'Virginia': 'VA', 'Washington': 'WA', 'West Virginia': 'WV',
            'Wisconsin': 'WI', 'Wyoming': 'WY'
          };

          const abbreviation = stateAbbreviations[stateToSelect];
          if (abbreviation) {
            const abbrevMatch = options.find((opt: any) => opt.text === abbreviation || opt.value === abbreviation);
            if (abbrevMatch) {
              valueToUse = abbrevMatch.value;
              console.log(`Found abbreviation match: ${valueToUse}`);
            }
          }
        }

        if (valueToUse) {
          try {
            await page.select('select', valueToUse);
            console.log('✅ Successfully selected state:', stateToSelect, 'with value:', valueToUse);
          } catch (selectError) {
            console.log('❌ Failed to select state value:', selectError);
          }
        } else {
          console.log('❌ Could not find matching state option for:', stateToSelect);
          console.log('Available options:', options.map((opt: any) => opt.text).join(', '));
        }
      } else {
        console.log('❌ Could not find state dropdown element');
      }
    } catch (e) {
      console.log('❌ Could not set state automatically:', e);
    }

    // Check the terms of service checkbox
    try {
      const checkbox = await page.$('input[type="checkbox"]');
      if (checkbox) {
        await checkbox.click();
        console.log('Checked terms of service checkbox');
      }
    } catch (e) {
      console.log('Could not check terms of service checkbox automatically');
    }

    console.log('Form filled successfully!');

  } catch (error) {
    console.error('Error filling form:', error);
  }
}

// Function to generate a random password meeting requirements
function generateRandomPassword(): string {
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';

  // Generate random length between 8-20
  const length = Math.floor(Math.random() * 13) + 8; // 8 to 20

  let password = '';

  // Ensure at least one uppercase letter
  password += uppercase[Math.floor(Math.random() * uppercase.length)];

  // Ensure at least one number
  password += numbers[Math.floor(Math.random() * numbers.length)];

  // Fill the remaining characters randomly
  const allChars = uppercase + lowercase + numbers;
  for (let i = 2; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password to randomize the position of required characters
  return password.split('').sort(() => Math.random() - 0.5).join('');
}

async function main() {
  console.log("Starting Puppeteer...");

  // Launch the browser
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    defaultViewport: { width: 1280, height: 720 }
  });

  try {
    // Create a new page
    const page = await browser.newPage();

    // Navigate to jackpota.com registration page
    console.log("Navigating to jackpota.com/register...");
    await page.goto('https://www.jackpota.com/register');

    // Wait for the page to load
    await page.waitForSelector('input[type="email"], input[name="email"], form', { timeout: 10000 });

    // Take a screenshot before filling
    console.log("Taking screenshot before form fill...");
    await page.screenshot({ path: 'jackpota-before-fill.png' });

    // Fetch random user data
    console.log("Fetching random user data...");
    const userData = await fetchRandomUser();
    console.log("User data:", userData);

    // Fill out the registration form
    await fillRegistrationForm(page, userData);

    // Take a screenshot after filling
    console.log("Taking screenshot after form fill...");
    await page.screenshot({ path: 'jackpota-after-fill.png' });

    // Get page title
    const title = await page.title();
    console.log(`Page title: ${title}`);

    console.log("Form automation completed successfully!");

  } catch (error) {
    console.error('An error occurred:', error);
  } finally {
    // Keep browser open for inspection (comment out the next line to auto-close)
    // await browser.close();
    console.log("Browser kept open for inspection. Close manually when done.");
  }
}


// Test the random user function (uncomment to test)
// fetchRandomUser()
//   .then(user => console.log("Random user data:", user))
//   .catch(error => console.error('Error fetching random user:', error));

// Test password generation (uncomment to test)
// console.log("Testing password generation:");
// for (let i = 0; i < 5; i++) {
//   const password = generateRandomPassword();
//   const hasUppercase = /[A-Z]/.test(password);
//   const hasNumber = /[0-9]/.test(password);
//   const isValidLength = password.length >= 8 && password.length <= 20;
//   console.log(`Password: ${password} (Length: ${password.length}, Uppercase: ${hasUppercase}, Number: ${hasNumber}, Valid: ${isValidLength})`);
// }

// Run the main function
main().catch(console.error);