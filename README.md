# DIAGCALC

DIAGCALC is a diagnostic test calculator with two interfaces:

- a web app for teaching and interactive use
- a terminal app with both TUI and plain CLI modes

Both interfaces use the same calculation engine.

## Repository

- GitHub: `https://github.com/tiagojct/diagcalc`

## Features

- confusion matrix input: TP, FP, FN, TN
- pre-test probability input
- sensitivity, specificity, PPV, NPV
- LR+ and LR-
- positive and negative post-test probability
- 95% confidence intervals with the Wilson method
- preset study scenarios
- Fagan nomogram in the web app
- TUI, text CLI, and JSON CLI output in the terminal app

## Web App

The web app is static. It does not need a build step.

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
5. Review the probability bars, result cards, and Fagan nomogram.

## Terminal App

The terminal app requires Node.js 18 or newer.

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

## Project Structure

- `index.html` - web app markup
- `styles.css` - web app styles
- `script.js` - web app logic and Fagan nomogram rendering
- `lib/diagcalc-core.js` - shared calculations and validation
- `lib/diagcalc-datasets.js` - shared preset datasets
- `tui/index.js` - terminal UI
- `bin/diagcalc.js` - CLI and TUI entrypoint
- `.github/workflows/deploy-pages.yml` - GitHub Pages deployment workflow

## License

MIT
