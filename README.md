# jackpota

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run start
# or specifically for Puppeteer
bun run puppeteer
```

This project was created using `bun init` in bun v1.2.20. [Bun](https://bun.com) is a fast all-in-one JavaScript runtime.

## Puppeteer Setup

This project includes [Puppeteer](https://pptr.dev/) for browser automation. The main script demonstrates:

- Launching a browser
- Navigating to jackpota.com/register
- Detecting user's network location (IP-based geolocation)
- Fetching random user data from [RandomUser.me API](https://randomuser.me/)
- Automatically filling out registration forms with location-aware state selection
- Taking before/after screenshots
- Error handling and fallback data

### Running Puppeteer

```bash
bun run puppeteer
```

This will:
1. Launch a browser window
2. Navigate to jackpota.com/register
3. Fetch random user data from the RandomUser.me API (US users only, over 21)
4. Automatically fill out the registration form with:
   - Random first and last names from US users
   - Generated password (meets requirements: 8-20 chars, uppercase + number)
   - Random date of birth (guaranteed over 21 years old)
   - **Network-detected US state selection** (based on your IP location)
   - Terms of service checkbox checked
5. Take before/after screenshots (`jackpota-before-fill.png` and `jackpota-after-fill.png`)
6. Keep browser open for inspection

### Configuration

- Browser launches in non-headless mode by default (visible window)
- Set `headless: true` in production environments
- Default viewport: 1280x720
