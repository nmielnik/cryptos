# CLAUDE.md

## Project
Crypto tax capital gains calculator. Aggregates transactions from multiple exchanges per year and computes gains/losses.

## How to run
```
node lib/calculate-gains.js
```
This runs the currently active tax year calculation and exports a closed-transactions CSV.

## How to update prices
```
node download-prices.js
```
Edit `targetCurrency` in download-prices.js to switch between BTC and ETH before running.

## Structure
- `lib/calculate-gains.js` — Entry point, orchestrates tax year calculation
- `lib/gains-calculator.js` — Core HIFO/FIFO/FILO gains engine + CSV export
- `lib/csv-merge.js` — Per-exchange CSV parsers and per-year CSV configs
- `lib/helpers.js` — Utility functions
- `lib/price-history.js` + `lib/prices/` — Historical BTC/ETH USD prices
- `local/` — (gitignored) Per-year CSV files from exchanges
- `test/` — Mocha tests (require Node 10+)

## Adding a new tax year
1. Add CSV files to `local/{year}/`
2. Add `csvs{year}` array in `csv-merge.js` mapping files to converters
3. Add `if (year >= {year})` block in `getGainsTransactions()`
4. Update `csvStatsToShow` to the new year's array
5. Update `calculate-gains.js` to call `doCapitalGainsCalculation({year})`
6. Ensure price data covers the full year (`download-prices.js`)

## Adding a new exchange
1. Add a converter function in the `converters` object in `csv-merge.js`
2. The converter takes a CSV row object and returns a normalized transaction object
3. Add the CSV file reference to the appropriate `csvs{year}` array
