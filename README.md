# Jackpota 🤖

A web automation tool built with Puppeteer and Bun for automated registration and gameplay on Jackpota.com, a sweepstakes casino platform.

## ⚠️ Disclaimer

This project is for educational and personal learning purposes only. Please ensure you comply with all terms of service and local gambling laws when using online casino platforms.

## 🚀 Features

- **Automated Registration**: Creates accounts with realistic user data
- **Email Verification**: Automatically handles email verification using temporary mail services
- **Form Filling**: Intelligently fills registration forms with various fallback strategies
- **Popup Handling**: Automatically dismisses welcome popups and promotional offers
- **Game Play**: Includes Spin-a-Win game automation
- **User Generation**: Creates realistic user profiles with random personal data

## 🛠️ Technology Stack

- **Runtime**: [Bun](https://bun.sh/) - Fast JavaScript runtime and package manager
- **Automation**: [Puppeteer](https://pptr.dev/) - Browser automation library
- **Language**: TypeScript
- **APIs**:
  - [RandomUser.me](https://randomuser.me/) - For generating realistic user data
  - [IP API](https://ipapi.co/) - For geolocation data
  - [mail.tm](https://mail.tm/) - For temporary email addresses

## 📦 Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd jackpota
```

2. Install dependencies using Bun:

```bash
bun install
```

## 🚦 Usage

### Basic Usage

Run the main automation script:

```bash
bun start
```

This will:

1. Generate a new user with realistic data
2. Navigate to Jackpota's registration page
3. Fill the registration form
4. Handle email verification (if required)
5. Complete the onboarding process

### Available Scripts

- `bun start` or `bun run puppeteer` - Launch the main automation
- The browser will run in non-headless mode by default for debugging

### Configuration

Edit `/src/main.ts` to modify behavior:

```typescript
const headless = false; // Set to true to run headless
```

## 🏗️ Project Structure

```
src/
├── main.ts                    # Main entry point
├── jackpota/
│   ├── pages/
│   │   ├── signup.ts          # Registration automation logic
│   │   └── spin-a-win.ts      # Spin-a-Win game automation
│   └── User/
│       ├── types.ts           # TypeScript interfaces
│       └── User.ts            # User data generation and management
```

## 🔧 Key Components

### User Generation (`User.ts`)

- Creates realistic user profiles with:
  - Random names from RandomUser.me API
  - Temporary email addresses via mail.tm
  - Geolocation data for appropriate regions
  - Valid dates of birth

### Registration Automation (`signup.ts`)

Handles the complete signup process with multiple fallback strategies:

- **Form Filling**: Adapts to different field naming conventions
- **Date Selection**: Handles month dropdowns and date inputs
- **State Selection**: Intelligently matches state names to dropdown options
- **Email Verification**: Monitors inbox and extracts verification links
- **Popup Handling**: Disposes of welcome offers and promotional popups

### Game Automation (`spin-a-win.ts`)

- Navigates to Spin-a-Win game
- Handles welcome popups
- Searches for sweepstakes coin play options

## 🎛️ Advanced Features

### Intelligent Form Detection

The automation uses multiple strategies to find form fields:

```typescript
// Example: Multiple selectors for email field
'input[type="email"], input[name="email"], input[name="email_address"]';
```

### Popup Management

Automatically handles various types of popups:

- Welcome offers (dismisses)
- Rewards popups (claims)
- Terms acceptance modals

### Error Recovery

Robust error handling with fallback strategies:

- Multiple attempts for button clicks
- Retry logic for network requests
- Screenshot capture for debugging

## 🔍 Debugging

The tool generates screenshots during execution:

- `after-form-submission.png`
- `looking-for-play-now.png`
- `searching-for-button.png`
- `after-enter-press.png`

## ⚙️ Environment Requirements

- Node.js/Bun runtime environment
- Chrome browser (for Puppeteer)
- Internet connection (for API calls)

## 📊 Logging

The automation provides detailed console output:

- User data generation steps
- Form filling progress
- Email verification status
- Button detection results
- Error messages and warnings

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📜 License

This project is for educational purposes. Please ensure you have the right to use and modify this code according to your needs and any applicable terms of service.

## 🔧 Troubleshooting

### Common Issues

1. **Timeout Errors**: Increase timeout values in configuration
2. **Button Not Found**: Check selectors and page structure
3. **Email Verification**: Ensure temporary mail service is working
4. **Form Submission**: Verify form field selectors match current website structure

### Monitoring

Check console output for detailed execution logs:

- 🔹 Pass/success indicators
- 🔸 Alert/failure indicators

---

**Remember**: This tool is designed for educational automation learning. Always respect website terms of service and use responsibly! 🎰
