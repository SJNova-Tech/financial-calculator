# Financial Calculator (TVM)

A web-based Time Value of Money calculator that works offline as a Progressive Web App (PWA). Styled to resemble the Pearson/MindTap financial calculator with full TVM functionality.

![Calculator Preview](https://img.shields.io/badge/PWA-Ready-brightgreen) ![Offline](https://img.shields.io/badge/Offline-Capable-blue) ![Mobile](https://img.shields.io/badge/Mobile-Responsive-orange)

## Features

- **Time Value of Money (TVM) Calculations**
  - Solve for N, I/Y, PV, PMT, or FV
  - Supports beginning (BGN) and end (END) payment modes
  - Configurable compounding (C/Y) and payment (P/Y) frequencies
  
- **Smart Solving**
  - Direct formulas for FV, PV, PMT
  - Newton-Raphson with bisection fallback for I/Y
  - Logarithmic and numeric solving for N

- **Calculator Interface**
  - Dark theme matching Pearson/MindTap style
  - TVM variable table with real-time display
  - Full numeric keypad with operators
  - Arrow key navigation between variables

- **PWA Features**
  - Works offline after first visit
  - Installable on mobile devices
  - No server required

## How to Run Locally

### Option 1: Using Python (Recommended)

```bash
# Python 3
python -m http.server 8000

# Then open: http://localhost:8000
```

### Option 2: Using Node.js

```bash
# Install serve globally (one time)
npm install -g serve

# Run the server
serve .

# Then open: http://localhost:3000
```

### Option 3: Using VS Code Live Server

1. Install the "Live Server" extension in VS Code
2. Right-click on `index.html`
3. Select "Open with Live Server"

### Option 4: Direct File Opening

Simply double-click `index.html` to open in your browser.

> **Note:** Service worker (offline caching) requires a local server to work properly.

## How to Publish to GitHub Pages

### Step 1: Create a GitHub Repository

1. Go to [github.com](https://github.com) and sign in
2. Click the **+** icon → **New repository**
3. Name it (e.g., `financial-calculator`)
4. Make it **Public**
5. Click **Create repository**

### Step 2: Push Your Code

```bash
# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit: Financial Calculator PWA"

# Add your remote (replace with your repo URL)
git remote add origin https://github.com/YOUR-USERNAME/financial-calculator.git

# Push to main branch
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** (gear icon)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select **Deploy from a branch**
5. Choose **main** branch and **/ (root)** folder
6. Click **Save**

### Step 4: Access Your Calculator

After a few minutes, your calculator will be live at:
```
https://YOUR-USERNAME.github.io/financial-calculator/
```

## How to Install on iPhone (for Classmates)

### Adding to Home Screen

1. Open **Safari** on your iPhone
2. Navigate to the calculator URL:
   ```
   https://YOUR-USERNAME.github.io/financial-calculator/
   ```
3. Tap the **Share** button (square with arrow pointing up)
4. Scroll down and tap **Add to Home Screen**
5. Give it a name (e.g., "FinCalc")
6. Tap **Add**

The calculator will now appear on your home screen like a native app!

### Benefits of Installing

- **Offline Access**: Works without internet after installation
- **Full Screen**: No browser chrome, feels like a native app
- **Quick Access**: Launch directly from home screen
- **No Updates Needed**: Automatically updates when online

## Usage Guide

### Entering Values

1. Type numbers using the keypad
2. Press a variable key (N, I/Y, PV, PMT, FV) to store the value
3. Alternatively, click a row in the TVM table to select it, then type and press ENTER

### Computing Unknown Values

1. Enter 4 of the 5 TVM values (N, I/Y, PV, PMT, FV)
2. Leave one value blank (or clear it)
3. Press **CPT** to compute the unknown value
4. Result appears highlighted in green

### Settings

- **C/Y**: Compounding periods per year (type a number, then press C/Y)
- **P/Y**: Payment periods per year (type a number, then press P/Y)
- **xP/Y**: Sets P/Y equal to C/Y
- **BGN**: Toggle between beginning and end of period payments

### Memory & Navigation

- **RCL**: Recall a stored value (press RCL, then a variable key)
- **▲ / ▼**: Navigate between TVM variables
- **C/CE**: Clear entry (press twice to clear all TVM values)
- **RESET**: Clear everything and reset to defaults

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 0-9 | Enter digits |
| . | Decimal point |
| Enter | Store value to selected variable |
| Backspace | Delete last digit |
| Escape | Clear entry |
| ↑ / ↓ | Navigate variables |
| +, -, *, / | Arithmetic operators |
| = | Calculate arithmetic |
| Ctrl+C | Compute (CPT) |

## TVM Formula Reference

### Variables

- **N**: Number of payment periods
- **I/Y**: Interest rate per year (as percentage)
- **PV**: Present Value (negative for cash outflows)
- **PMT**: Payment amount per period
- **FV**: Future Value

### Periodic Rate Conversion

```
i = (1 + I/Y% / C/Y)^(C/Y / P/Y) - 1
```

### TVM Equation (End Mode)

```
PV + PMT × [(1+i)^N - 1] / i + FV × (1+i)^(-N) = 0
```

### TVM Equation (Begin Mode)

```
PV + PMT × [(1+i)^N - 1] / i × (1+i) + FV × (1+i)^(-N) = 0
```

## Sign Convention

Follow the **cash flow sign convention**:
- **Negative (-)**: Cash going out (payments you make)
- **Positive (+)**: Cash coming in (money you receive)

### Example: Loan Payment

If you borrow $10,000 at 6% for 5 years:
- PV = +10,000 (you receive money)
- I/Y = 6
- N = 60 (5 years × 12 months)
- FV = 0
- Compute PMT → Result will be negative (you pay)

## Files

```
financial-calculator/
├── index.html          # Main HTML structure
├── styles.css          # Calculator styling
├── app.js              # TVM logic and interactivity
├── manifest.webmanifest # PWA manifest
├── sw.js               # Service worker for offline
└── README.md           # This file
```

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11.1+
- Edge 79+
- iOS Safari 11.3+
- Chrome for Android 60+

## License

MIT License - Free to use, modify, and distribute.

## Troubleshooting

### Calculator not working offline?
- Make sure you've visited the page while online first
- Try refreshing the page
- Check that your browser supports service workers

### PWA not installable?
- Ensure you're accessing via HTTPS (GitHub Pages provides this)
- Try using Chrome or Safari for best PWA support

### Calculations seem wrong?
- Check your sign convention (loans are positive PV, payments are negative PMT)
- Verify C/Y and P/Y settings match your problem
- Make sure you've set exactly 4 of the 5 TVM values
