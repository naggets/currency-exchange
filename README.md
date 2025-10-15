# 💱 Currency Calculator

Multi-currency converter with custom exchange rates support. Perfect for tracking conversions through multiple currencies with bank-specific rates.

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://yourusername.github.io/currency-calculator/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue)](https://github.com/yourusername/currency-calculator/releases)

## ✨ Features

- 🔄 **Bidirectional Conversion** - Enter amount in any currency, all others calculate automatically
- 💾 **Auto-Save** - Exchange rates saved locally in your browser
- 📱 **Mobile Friendly** - Fully responsive design, works great on phones
- 🌐 **Visa Integration** - Quick link to check official Visa exchange rates
- 🎨 **Clean UI** - Modern, intuitive interface
- ⚡ **Fast & Lightweight** - Pure HTML/CSS/JS, no frameworks needed
- ♿ **Accessible** - WCAG compliant, keyboard navigation support

## 🚀 Demo

Try it live: [https://yourusername.github.io/currency-calculator/](https://yourusername.github.io/currency-calculator/)

## 📸 Screenshots

![Currency Calculator Screenshot](docs/screenshot.png)

## 🎯 Use Case

Perfect for scenarios where you need to track currency conversions through multiple steps:
- RUB → KGS → USD → JPY
- Custom bank exchange rates
- Multi-hop currency transfers
- International payment calculations

## 🛠️ Tech Stack

- **HTML5** - Semantic markup
- **CSS3** - Modern styling with CSS Grid/Flexbox
- **Vanilla JavaScript** - No dependencies
- **LocalStorage API** - Client-side data persistence

## 📦 Installation

### Option 1: Use GitHub Pages (Recommended)

1. Fork this repository
2. Go to Settings → Pages
3. Set Source to `main` branch, `/ (root)` folder
4. Your site will be live at `https://yourusername.github.io/currency-calculator/`

### Option 2: Clone and Run Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/currency-calculator.git

# Navigate to the project
cd currency-calculator

# Open in browser (or use any local server)
open index.html
# OR with Python
python -m http.server 8000
# OR with Node.js
npx http-server
```

### Option 3: Download ZIP

1. Click "Code" → "Download ZIP"
2. Extract the files
3. Open `index.html` in your browser

## 📱 Add to Home Screen (iOS/Android)

### iOS (Safari)
1. Open the app in Safari
2. Tap the Share button (square with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Tap "Add"

### Android (Chrome)
1. Open the app in Chrome
2. Tap the menu (three dots)
3. Tap "Add to Home screen"
4. Tap "Add"

## 🔧 Usage

### Setting Exchange Rates

1. **RUB → KGS**: Enter the bank's **sell rate** for RUB
2. **KGS → USD**: Enter the bank's **buy rate** for USD
3. **USD → JPY**: Enter the conversion rate (check Visa for accuracy)

Rates are automatically saved in your browser.

### Converting Currencies

Simply enter an amount in any currency field - all other currencies will calculate automatically!

**Example:**
- Enter `1000` in JPY field
- Instantly see equivalent in RUB, KGS, and USD

### Checking Visa Rates

Click the "🌐 Visa" button next to USD → JPY field to open Visa's official exchange rate calculator.

## 📁 Project Structure

```
currency-calculator/
├── index.html              # Main HTML file
├── styles/
│   └── main.css           # Stylesheet
├── scripts/
│   └── calculator.js      # Application logic
├── manifest.json          # PWA manifest
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── LICENSE               # MIT License
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Guidelines

1. **Code Style**: Follow existing code style
2. **Commits**: Use semantic commit messages
   - `feat:` new features
   - `fix:` bug fixes
   - `docs:` documentation changes
   - `style:` formatting, missing semicolons, etc.
   - `refactor:` code restructuring
   - `test:` adding tests
   - `chore:` maintenance tasks

### Steps to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'feat: add some amazing feature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 🐛 Bug Reports

Found a bug? Please open an issue with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information
- Screenshots if applicable

## 💡 Feature Requests

Have an idea? Open an issue with:
- Clear description of the feature
- Use case explanation
- Any relevant examples or mockups

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Exchange rates powered by user input
- Visa rate reference: [Visa Exchange Rate Calculator](https://www.visa.com.sg/support/consumer/travel-support/exchange-rate-calculator.html)
- Icons: Unicode emoji

## 📊 Changelog

### v1.0.0 (2025-10-15)
- Initial release
- Support for RUB, KGS, USD, JPY
- Bidirectional conversion
- LocalStorage persistence
- Mobile-responsive design
- Visa rate integration

## 🔮 Roadmap

- [ ] Add more currencies
- [ ] Historical rate tracking
- [ ] Export conversion history
- [ ] Dark mode
- [ ] Multi-language support
- [ ] PWA offline support
- [ ] Rate change notifications

## 📞 Contact

Project Link: [https://github.com/yourusername/currency-calculator](https://github.com/yourusername/currency-calculator)

---

Made with ❤️ for easier currency conversions