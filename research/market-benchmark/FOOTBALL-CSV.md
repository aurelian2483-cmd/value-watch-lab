# Football closing-odds CSV connection (private research)

Uses local CSVs manually obtained from [Football-Data](https://www.football-data.co.uk/downloadm.php), **not** a provider API or scheduled scraper. Respect the publisher's [fair-use conditions](https://www.football-data.co.uk/contact.php): free data is for personal betting/academic research with manual or light download, not heavy automated training/commercial redistribution. Do not use this adapter for commercial research without separate rights.

This intentionally connects only a **historical market baseline**, not the existing betting predictions. Price timestamps are absent from typical season files, so the output explicitly refuses to claim independently verified pre-event quotes or closing-line value. No raw source records are uploaded to the public repository.

## Local private use

1. Manually download a permitted season CSV and keep it outside the GitHub checkout.
2. Make sure it contains complete outcome (`FTR`: H/D/A) and one same-bookmaker closing H/D/A odds family (`AvgCH/AvgCD/AvgCA`, `B365CH/B365CD/B365CA`, or `PSCH/PSCD/PSCA`). The averages are not an executable bookmaker quote.
3. In a **private** terminal run:

```sh
VALUEWATCH_PRIVATE_PERSONAL_RESEARCH=YES node research/market-benchmark/import-football-csv.cjs /private/season.csv /private/market-summary.json --prefix AvgC
```

On Windows PowerShell set the environment variable using `$env:VALUEWATCH_PRIVATE_PERSONAL_RESEARCH = 'YES'` before running the Node command.

The selected `--prefix` must identify a **complete** 1X2 closing odds set. The adapter skips invalid or incomplete rows and counts exclusions. It emits only aggregate, descriptive historical market log loss/Brier, overround, coverage counts and explicit `UNVALIDATED/BLOCKED` gates. It cannot establish that a quote was actually available at a particular instant.

**Do not** inject the aggregate into the Betting Hub as a probability forecast, use it as an executable odds quote, or compare it with any model score produced on a different fixture subset. The model-vs-market comparison in `evaluate-file.cjs` still requires independently verified event mapping, frozen forecasts, outcomes, data rights and timestamped quotes.

Run `node tests/test_football_csv_market_import.cjs` for a synthetic test of CSV parsing and privacy gates.

Future integration may use an appropriately licensed, authenticated time-stamped odds source. Do not purchase a paid plan or add credentials without approval.
