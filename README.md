# Currency Calculator

[Open the calculator](https://naggets.github.io/currency-exchange/)

Editable chains of 2–10 currencies, automatic quotes, per-pair fees and an additional ATM surcharge. Settings stay in the current browser.

## Use

Choose a transfer route (ELQR + Bakai or Unired), then choose the spending currency from its dropdown. Existing saved chains are preserved. Currency arrows move nodes, and choosing another currency already in the chain swaps the two nodes. Quotes are kept only for unchanged pairs; new pairs get a supported source or require a manual quote. Changing the spending currency of an existing USD Visa pair preserves its fee settings. Individual quote settings and source details are expandable. Add EUR if you need a further cash exchange and enter its exchange-office quote manually.

Automatic sources support these directions:

| Source | Pair | Data publisher |
| --- | --- | --- |
| MTS ELQR | RUB → KGS | Public morning Curso table, row Multitransfer (Elkart); matched against the user's MTS quote on 2026-10-04 |
| Unired | RUB → USD | Public morning Curso table, plain Unired row |
| Bakai | KGS → USD / USD → KGS | Official noncash sell / buy quotes |
| Visa | USD budget → selected currency spending | Kylc copy of Visa's spending → USD billing rate |

For Japan, select **JPY** in the currency dropdown and select Visa for the USD → JPY pair. Currency dropdowns include collected codes and Russian names. The collector follows all currency links published by Kylc for USD cards, with two concurrent requests. Each currency is checked independently; missing or stale quotes require manual input. The official comparison below covers RSD; other currencies are published mirror values without an individual official comparison.

Visa was compared with its official calculator for 2026-10-01, 2026-10-02 and 2026-10-04. Values matched at Kylc's published precision of 8 decimal places; this is not a guarantee of future data. Curso is a third-party morning snapshot, not an intraday quote from the transfer service. Telegram login is not used. Each pair shows its publisher, publication/quote date and collection time, with a link to the source.

A normal card payment and the inverse budget calculation use the same spending/billing quote. This does not describe a new payment in the opposite direction. Bank and ATM settlement conditions may affect the final debit.

## Fees

For a fee added to the debit, the affordable converted amount is `budget × base rate / (1 + fee / 100)`. The Visa preset uses OIF 1.5%. Other modes are withholding and an already fee-inclusive quote; the latter avoids charging twice. ATM fees are calculated separately after the pair fees. Choose the local cash currency and the card/fee currency independently. Enter the desired cash amount, or switch to a total card budget. The withdrawal fee is `max(card amount × percent / 100, minimum)` in the selected card currency, with no intermediate rounding. Example: 65,000 RSD at Visa 104.2799625 RSD/USD, OIF 1.5%, withdrawal 1% with a minimum 3 USD results in about 632.67 USD conversion + 6.33 USD fee = 639.00 USD debit. The breakdown lists cash, conversion, fee, total debit and equivalents across the chain. A missing quote outside the cash/card path does not block the withdrawal calculation; that equivalent is marked unavailable.

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
