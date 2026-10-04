# Currency Calculator

[Open the calculator](https://naggets.github.io/currency-exchange/)

Editable chains of 2–10 currencies, automatic quotes, per-pair fees and an additional ATM surcharge. Settings stay in the current browser.

## Use

Choose **ELQR → Бакай → Visa → EUR** for RUB → KGS → USD → RSD → EUR, or **RUB → USD → RSD → EUR** for Unired. These buttons replace the current chain. Enter the exchange-office EUR rate manually: the inverse quote accepts the number of RSD paid for 1 EUR. Existing saved settings remain unchanged until you select a preset.

Automatic sources support these directions:

| Source | Pair | Data publisher |
| --- | --- | --- |
| MTS ELQR | RUB → KGS | Public morning Curso table, row Multitransfer (Elkart); matched against the user's MTS quote on 2026-10-04 |
| Unired | RUB → USD | Public morning Curso table, plain Unired row |
| Bakai | KGS → USD / USD → KGS | Official noncash sell / buy quotes |
| Visa | USD budget → selected currency spending | Kylc copy of Visa's spending → USD billing rate |

For Japan, rename the currency to **JPY** and select Visa for the USD → JPY pair. Currency inputs suggest collected codes. The collector follows all currency links published by Kylc for USD cards, with two concurrent requests. Each currency is checked independently; missing or stale quotes require manual input. The official comparison below covers RSD; other currencies are published mirror values without an individual official comparison.

Visa was compared with its official calculator for 2026-10-01, 2026-10-02 and 2026-10-04. Values matched at Kylc's published precision of 8 decimal places; this is not a guarantee of future data. Curso is a third-party morning snapshot, not an intraday quote from the transfer service. Telegram login is not used. Each pair shows its publisher, publication/quote date and collection time, with a link to the source.

A normal card payment and the inverse budget calculation use the same spending/billing quote. This does not describe a new payment in the opposite direction. Bank and ATM settlement conditions may affect the final debit.

## Fees

For a fee added to the debit, the affordable converted amount is `budget × base rate / (1 + fee / 100)`. The Visa preset uses OIF 1.5%. Other modes are withholding and an already fee-inclusive quote; the latter avoids charging twice. ATM fees are calculated separately after the pair fees.

## Updates and failures

GitHub Actions collects and deploys rates every two hours, at minute 37 UTC, and on pushes to main. GitHub scheduling may be delayed. Scheduled workflows in public repositories may be disabled after 60 days without repository activity; they can be re-enabled in Actions.

The refresh button downloads the last published JSON, rather than directly querying upstream services. Collection timestamps older than 6 hours are rejected; Curso publications older than 36 hours and Visa mirror dates older than 3 days are rejected. Fetching an old publication never changes its publication time. Failed sources are marked unavailable while successful sources can still publish. If every source fails, deployment stops and the previous site remains until its quotes expire.

OCR checks expected image layout, currency headings, publication dates and recognition confidence. A changed layout or ambiguous extraction fails closed. Public aggregation can still contain errors; check the original transfer app before sending money.

## Development

Node.js 24:

```sh
npm ci
npm test
npm run collect-rates
node scripts/build-site.cjs
```

Only `_site` is uploaded to Pages. Collector code, dependencies and language models are not included in the public site artifact. `data/rates.json` committed to the repository is an initial snapshot; scheduled deployments generate their own JSON without committing it.

Sources: [Visa original](https://www.visa.co.uk/support/consumer/travel-support/exchange-rate-calculator.html), [Kylc](https://www.kylc.com/huilv/i-visa/usd/rsd.html), [Bakai](https://bakai.kg/ru/), [Curso public channel](https://t.me/s/CursoUz).
