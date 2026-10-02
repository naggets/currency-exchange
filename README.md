# 💱 Currency Calculator

A lightweight currency chain calculator with manually entered exchange rates and an optional ATM surcharge.

[Open the calculator](https://naggets.github.io/currency-exchange/)

## Usage

- Edit any currency name in **Валюты и курсы**. Add or remove the last currency to build a chain of 2–10 currencies (four pairs means five currencies).
- The **RUB → KGS → RSD → EUR** button sets up that chain and clears the rates. Enter your actual rates manually.
- Every rate is quoted as **1 currency on the left = rate × currency on the right**. For example, if 1 EUR costs 117 RSD, the RSD → EUR rate is `0.008547008547` (1 / 117).
- Enter an amount in any currency. Changing a rate preserves the last amount you entered and recalculates the rest. Calculations use full precision; displayed amounts have two decimal places.
- Names, rates, and ATM settings are saved in this browser. Older RUB/KGS/USD/JPY settings migrate automatically, including the inverse KGS/USD quote.
- All rates are manual. The Visa link is a reference link only.

## ATM commission

Enable **Учитывать комиссию**, select the withdrawal currency and enter the percentage added on top of the cash amount.

- **Наличные, которые хочу получить**: cash 100 + 2% fee = debit 102.
- **Бюджет вместе с комиссией**: budget 102 / 1.02 = cash 100, fee 2.

The ATM result shows cash, fee, total debit, and the debit converted through the entire chain. The main amount fields remain conversions before the ATM fee. Reverse conversion uses the same rates, so separate buy/sell spreads must already be reflected in the manually entered rates.

## Development

Plain HTML, CSS and JavaScript; no build or runtime dependencies. Serve this folder with any static web server, or open `index.html` locally.

Run calculation tests with Node.js:

```sh
node --test tests/conversion.test.js
```

GitHub Pages deploys from `main`. Pull requests validate HTML and run calculation tests.

## License

[MIT](license.md)
