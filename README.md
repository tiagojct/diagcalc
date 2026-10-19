# DIAGCALC

DIAGCALC is a diagnostic test calculator with two interfaces:

- a web app for teaching and interactive use
- a terminal app with both TUI and plain CLI modes

Both interfaces use the same calculation engine.

## Repository

- GitHub: `https://github.com/tiagojct/diagcalc`
- Web app: `https://diagcalc.tiagojacinto.eu/`
- npm package: `https://www.npmjs.com/package/diagcalc`

## Description

DIAGCALC is designed for a simple job: start from a confusion matrix, calculate the main diagnostic test measures, and show how the test result changes the probability of disease.

It is built for teaching, self-study, and quick practical use. The web app is useful in the classroom and in browser-based demonstrations. The terminal app is useful for keyboard-driven work, SSH sessions, scripting, and lightweight environments.

## Operating Model

The app follows the same sequence used in many teaching sessions on diagnostic reasoning:

1. define the case or load a reference scenario
2. inspect the confusion matrix
3. estimate the pre-test probability
4. calculate core performance measures
5. interpret LR+ and LR-
6. update to post-test probability

The web and terminal interfaces both follow that workflow.

## Philosophy

- keep the calculator simple enough to use during teaching
- keep the maths explicit and easy to verify
- keep the interfaces lightweight and dependency-light
- keep the same results across web, TUI, and CLI
- support both interactive learning and automation

## Features

- confusion matrix input: TP, FP, FN, TN
- pre-test probability input
- sensitivity, specificity, PPV, NPV
- LR+ and LR-
- positive and negative post-test probability
- Wilson 95% intervals for proportions and log-normal intervals for likelihood ratios and DOR
- illustrative teaching scenarios with explicit provenance
- continuous probability rail from pre-test to post-test, with positive/negative comparison
- Fagan nomogram in the web app
- TUI, text CLI, and JSON CLI output in the terminal app

## Case Studies

All current presets are illustrative teaching scenarios. Medical references provide background; their confusion-matrix counts have not been verified against retained source-table extractions. They must not be presented as published study estimates.

- `screening` - low-prevalence population screening workflow
- `caseControl` - balanced case-control teaching example
- `clinic` - specialist clinic setting with intermediate prevalence
- `ddimer` - D-dimer for pulmonary embolism rule-out
- `troponin` - high-sensitivity troponin for acute myocardial infarction
- `mammography` - screening mammography in a low-prevalence setting
- `covid_antigen` - rapid antigen testing for COVID-19
- `hiv_elisa` - fourth-generation HIV ELISA screening
- `strep_throat` - rapid antigen testing for streptococcal pharyngitis
- `xray_pneumonia` - chest X-ray for community-acquired pneumonia
- `wells_dvt` - Wells score for suspected deep-vein thrombosis
- `heart_acs` - HEART score for major adverse cardiac events
- `curb65` - CURB-65 for severe community-acquired pneumonia
- `qsofa` - qSOFA for sepsis screening
- `apgar_5min` - 5-minute APGAR for severe neonatal outcome
- `fast_trauma` - FAST ultrasound for blunt abdominal trauma

These cases are included to support teaching across different prevalence settings, screening vs. confirmation logic, and Bayesian interpretation of test results.

## Web App

The web app is static. It does not need a build step and loads no third-party scripts. The interface is organised into **Case**, **Explore**, **Learn** and **History** tabs. The Case tab keeps the 2×2 matrix, a single probability rail and the interpretation in one working surface; the other tabs hold the exploration tools, teaching notes and saved cases. IBM Plex Sans, Mono and Serif are self-hosted in `web/fonts/`, so the page remains offline-capable. Neutral light/dark themes and responsive matrix tracks keep the calculator readable on phones, tablets and desktop screens.

It is intended for teaching sessions, demonstrations, and direct interactive exploration.

### Run locally

Open `index.html` directly in a browser, or serve the folder locally:

```bash
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

### Use

1. Load a preset scenario, or leave the selector empty.
2. Enter TP, FP, FN, TN.
3. Enter pre-test probability.
4. Click `Calculate results`.
5. Review the probability rail, headline values, metric ledger and the “Why this result” note. Use **Explore** for prevalence, chaining, thresholds, ROC and agreement; **Learn** for interpretation and references.

## Terminal App

The terminal app requires Node.js 22 or newer.

It is intended for keyboard-first use, quick calculations, reproducible terminal workflows, and scripting.

### Install locally

```bash
npm install
```

### TUI mode

```bash
node bin/diagcalc.js --tui
```

If you want the short command:

```bash
npm link
diag --tui
```

### CLI mode

List datasets:

```bash
diag --list-datasets
```

Run a preset case:

```bash
diag --dataset hiv_elisa
```

Run an ad hoc case:

```bash
diag --tp 42 --fp 8 --fn 3 --tn 120 --pre 15
```

Get JSON output:

```bash
diag --dataset ddimer --format json
```

The CLI is useful when you want a one-shot calculation or when you want to integrate the calculator into scripts or other tooling.

### TUI controls

- `Tab` / `Ctrl-N`: next panel
- `Shift-Tab` / `Ctrl-P`: previous panel
- arrows: move selection
- type digits directly in the input editor
- `Backspace`: delete one character from the selected field
- `Delete` or `Ctrl-U`: clear the selected field
- `Enter`: open the selected field in prompt mode
- `n`: start a blank ad hoc case
- `x`: export current case to plain text
- `m`: export current case to Markdown
- `r`: reset current case
- `q`: quit

## Validation and reproducibility

Counts must be non-negative safe integers, including their total. Both disease cohorts must be present. Pre-test probability accepts complete dot/comma decimal strings from 0 through 100 inclusive. Impossible conditioning events remain undefined and display an em dash; infinite ratios display infinity. Chaining retains full precision and assumes tests are conditionally independent given disease status.

Continuity correction applies to confidence intervals only. Point estimates and post-test probabilities always use the observed cells, so a zero cell still displays infinity or zero and exact chaining is preserved. A corrected interval can therefore exclude an infinite or zero point estimate; the interface labels it `continuity-corrected`, and snapshots record `"corrected": true` inside that metric's `ci` object.

The browser's history retains the inputs, continuity correction, engine version and origin for each calculation. Editing a preset marks it customised and invalidates previous results. Storage restrictions fall back to session memory; they do not prevent calculations. Older history entries are explicitly marked as recalculated legacy cases because their original correction settings were not recorded.

### Version 5 JSON compatibility

`--format json` now emits schema version 2. Every metric and CI endpoint encodes exceptional numbers explicitly:

```json
{"value": null, "status": "infinite", "ci": null}
```

Statuses are `finite`, `infinite`, `negative-infinite`, and `undefined`; finite values are unrounded. Consumers of the previous JSON format must migrate. Outputs include engine version, inputs, correction options and provenance. TUI text/Markdown exports append a reproducible JSON snapshot and refuse to overwrite existing paths.

ROC rows must represent the same cohorts with monotonic operating points and consistently ordered cutoffs. Synthetic points and edited synthetic points remain labelled illustrative, including their AUC. Decision thresholds are unavailable for uninformative or inverted tests. Nomogram lines outside its labelled axis range are explicitly omitted; numeric probabilities remain available.

## Development checks

```bash
npm ci
npx playwright install chromium firefox webkit
npm run check
```

`check` type-checks the shared calculation modules and terminal report helpers, then runs engine/CLI/TUI/package tests and browser tests in Chromium, Firefox and WebKit. Browser tests prepare the actual static deployment bundle automatically. Python 3 and a pseudo-terminal are required for the real terminal test on Unix; that test is skipped on Windows. The browser app loads no third-party runtime code and needs no compilation step.

Pull requests run checks on Node 22 and 24 and all three browser engines. Main-branch deployment requires both verification jobs. `npm run prepare:site` copies only browser assets and `CNAME` into `public/`; package tests also extract and execute the actual npm archive outside the checkout.

See [DESIGN.md](DESIGN.md) for the Probability Rail visual system and tokens, [PRODUCT.md](PRODUCT.md) for product truth, [lib/README.md](lib/README.md) for API contracts and [docs/PROVENANCE.md](docs/PROVENANCE.md) for dataset evidence requirements.

## Deployment

### GitHub Pages

This repository includes a GitHub Pages workflow at `.github/workflows/deploy-pages.yml`.

To publish the web app:

1. Push to the `main` branch.
2. In GitHub, open `Settings -> Pages`.
3. Set the source to `GitHub Actions`.
4. The workflow will publish the static site automatically.

### npm

This package is ready for npm publishing.

Publish steps:

```bash
npm login
npm publish --access public
```

After publishing, users can install it with:

```bash
npm install -g diagcalc
diag --tui
```

Package page:

- `https://www.npmjs.com/package/diagcalc`

## Project Structure

- `index.html` - web app markup
- `styles.css` - web app styles
- `script.js` - web state, tabs and event handling
- `web/rail.js` - probability rail rendering and active-result state
- `web/rail.css` - Probability Rail design system, responsive and print layers
- `web/fonts/` - self-hosted IBM Plex font files and licence
- `web/` - result rendering and scheduled DPR-aware charts
- `lib/diagcalc-core.js` - shared numeric calculations and validation
- `lib/diagcalc-presentation.js` - English/Portuguese metric labels and interpretation
- `lib/diagcalc-i18n.js` - browser translation tables, DOM application and relocalisation
- `lib/diagcalc-case.js` - versioned snapshots and safe exceptional-number encoding
- `lib/diagcalc-storage.js` - resilient browser preferences and session fallback
- `lib/diagcalc-geometry.js` - independently testable nomogram geometry
- `lib/diagcalc-datasets.js` - shared preset datasets
- `lib/diagcalc-meta.js` - engine version and schema metadata
- `lib/diagcalc-types.d.ts` - shared type contracts
- `tui/index.js` - terminal UI
- `bin/diagcalc.js` - CLI and TUI entrypoint
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## License

MIT
