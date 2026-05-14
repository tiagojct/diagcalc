# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## See also

`AGENTS.md` at the repo root contains detailed style, naming, accessibility, and CSS conventions — read it before making non-trivial changes. Note `AGENTS.md` predates the terminal app: it claims there is "no package manager" and gives some validation examples in Portuguese, both of which are now stale. The current source of truth for runtime behaviour is the code in `lib/`, and all user-facing strings in `lib/diagcalc-core.js` are English.

## Commands

There is no build step, linter, or test runner. Verification is manual.

```bash
# Web app — open directly or serve statically
python3 -m http.server 8080

# Terminal UI (also: npm run tui)
node bin/diagcalc.js --tui

# CLI one-shot
node bin/diagcalc.js --dataset hiv_elisa
node bin/diagcalc.js --tp 42 --fp 8 --fn 3 --tn 120 --pre 15
node bin/diagcalc.js --dataset ddimer --format json
node bin/diagcalc.js --list-datasets

# Install global `diag` / `diagcalc` symlinks for local dev
npm link
```

Requires Node.js >= 18. `blessed` is the only runtime dependency (for the TUI).

## Architecture

Three interfaces — a static web app, a `blessed`-based TUI, and a plain CLI — share **one calculation engine** and **one dataset registry**. Anything that affects calculations or presets must be edited in `lib/`, never duplicated into the interface layers.

### The dual-loader pattern (load-bearing)

`lib/diagcalc-core.js` and `lib/diagcalc-datasets.js` use a UMD-style wrapper:

```js
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcCore = factory();  // browser global
}(typeof globalThis !== "undefined" ? globalThis : this, () => { ... }));
```

This is what lets the same file power both the browser (`window.DiagcalcCore`, loaded via `<script>` tag in `index.html`) and Node (`require("../lib/diagcalc-core")` from `bin/` and `tui/`). **Do not convert these modules to ES modules or CommonJS-only** — both consumers depend on this dual loading. New shared modules should follow the same wrapper.

### Calculation flow

The pipeline is identical across all three interfaces:

1. **Read inputs** (TP, FP, FN, TN, pre-test probability) from form, TUI panel, or CLI flags.
2. **`core.validateInputs(...)`** → `{ valid, message }`. Never throws; surface failures through `setFeedback` (web), a status panel (TUI), or stderr (CLI).
3. **`core.calculateMetrics(...)`** → a structured object with sensitivity, specificity, PPV, NPV, LR+, LR-, pre-test, and post-test probabilities — each as `{ label, value, ci?, note, formatter? }`. Wilson 95% CIs are computed for proportions; LRs use `formatLikelihood`.
4. **Render**: web uses DOM cards + a canvas Fagan nomogram; TUI uses `blessed` boxes plus `core.buildProbabilityBar` for ASCII bars; CLI prints text or JSON.

Mathematical edge cases (divide-by-zero, p=1, infinite odds) are absorbed inside `core` helpers (`calculateRatio`, `calculateOdds`, `multiplyOdds`, `probabilityFromOdds`) — they return `Infinity`/`0`/`NaN` deliberately. Formatters at the boundary translate these to `"—"`, `"∞"`, etc. Don't add try/catch around these calls; check `Number.isFinite` instead.

### Datasets

`lib/diagcalc-datasets.js` exports `{ datasets, listDatasets, getDataset }`. Dataset keys are `snake_case` (e.g. `covid_antigen`, `hiv_elisa`). Adding a dataset:

1. Add the entry in `lib/diagcalc-datasets.js` (TP/FP/FN/TN, pre-test prob, name, description, optional `reference`).
2. Add a matching `<option value="...">` in `index.html` under the dataset `<select>`.
3. The TUI and CLI pick it up automatically via `listDatasets()` — no further wiring.

### Deployment surface

`.github/workflows/deploy-pages.yml` publishes only `index.html`, `script.js`, `styles.css`, and `lib/` to GitHub Pages. The `tui/` and `bin/` directories are **not** part of the deployed web app — they only ship via npm (see the `files` array in `package.json`). Keep browser-only code out of `lib/` (no `window.*`, no DOM access) so the shared modules stay loadable from Node.

### Theming and the Fagan nomogram

The web app's Fagan nomogram is rendered to `<canvas>` via the 2D API. Theme colours must be read at draw-time from CSS custom properties (`getComputedStyle(document.documentElement).getPropertyValue('--accent-warm')`) and the canvas must be redrawn when `[data-theme="dark"]` toggles — otherwise the nomogram stays in the previous theme's palette.

## Versioning

Bump `version` in `package.json`, `package-lock.json`, and the `.app-bar-version` span in `index.html` (`<span class="app-bar-version">v{x.y.z}</span>`). Add a dated `## [x.y.z] — YYYY-MM-DD` entry in `CHANGELOG.md` (Keep-a-Changelog format, section headers in Portuguese: `### Adicionado`, `### Alterado`, `### Corrigido`, `### Técnico`).

The web app has no build step, so the version chip in the app bar is mirrored manually — keep these four targets in lockstep.
