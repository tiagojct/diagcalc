# AGENTS.md — diagcalc

Guidance for AI coding agents working in this repository.

---

## Project Overview

**diagcalc** is a static, zero-dependency diagnostic calculator built with vanilla HTML, CSS, and JavaScript (ES6+). It runs directly in the browser with no build step. The entire application lives in three files:

- `index.html` — full application markup
- `script.js` — all JavaScript logic (~850 lines)
- `styles.css` — all styles (~760 lines, Flexoki color theme + dark mode)

There is no package manager, no bundler, no transpiler, and no test runner.

---

## Running the Application

Open `index.html` directly in any modern browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Or serve locally to avoid any file:// quirks
python3 -m http.server 8080
# then open http://localhost:8080
```

---

## Build, Lint, and Test Commands

There are **no automated build, lint, or test commands**. The project has no `package.json` or any Node tooling. Automated tests are explicitly listed as a future improvement in `UPDATES.md`.

To validate changes:
1. Open `index.html` in a browser.
2. Exercise the calculator manually: enter confusion matrix values, change the dataset selector, toggle dark mode, resize the viewport.
3. Verify the Fagan nomogram canvas renders correctly on both light and dark themes.
4. Check the browser console for errors — there should be none.

---

## Code Style

### Language

All UI text, code comments, variable labels, validation messages, and documentation are in **English**. The HTML `lang` attribute is set to `"en"`. Keep new additions in English, following standard British/international spelling where applicable (e.g., `normalise`).

### JavaScript

- **Vanilla ES6+** — no frameworks, no imports, no modules.
- All code runs inside a `DOMContentLoaded` listener or as named function declarations in the outer scope.
- **Indentation:** 2 spaces (no tabs).
- **Quotes:** double quotes for all strings (`"text"`, not `'text'`).
- **Semicolons:** always present at end of statements.
- **Trailing commas:** used in multi-line object literals and arrays.
- **`const` vs `let`:** use `const` for DOM references and values that are never reassigned; use `let` for loop counters and values that change. Avoid `var`.
- **Arrow functions** for callbacks and event listeners; **`function` declarations** for named top-level helpers.
- Separate major sections with a single-line comment banner, e.g.:

  ```js
  // ── Metrics Calculation ─────────────────────────────────────────
  ```

### Naming Conventions

| Construct | Convention | Example |
|---|---|---|
| Functions | `camelCase` | `calculateMetrics`, `renderResults` |
| Variables | `camelCase` | `preTestProb`, `lrPositive` |
| Object keys | `camelCase` | `postTestPositive`, `nonDiseased` |
| Dataset keys | `snake_case` | `covid_antigen`, `hiv_elisa` |
| CSS classes | `kebab-case` | `.result-card`, `.probability-chart` |
| CSS custom props | `kebab-case` | `--primary-color`, `--muted-text` |

### Types

There is no TypeScript. Types are validated at runtime:
- Use `Number.isNaN()` and `Number.isFinite()` — never `isNaN()` (global).
- Use `typeof value !== "string"` for guard checks.
- Add JSDoc comments when introducing new functions if their signatures are non-obvious.

---

## Error Handling

Use **validation-before-action** — never throw exceptions for user input errors. Follow the established pattern:

```js
// Validation returns a result object, never throws
function validateInputs(inputs) {
  if (inputs.some((v) => Number.isNaN(v) || v < 0)) {
    return { valid: false, message: "Os valores devem ser números não negativos." };
  }
  return { valid: true };
}

// Surface errors through the accessible feedback element
const result = validateInputs([tp, fp, fn, tn]);
if (!result.valid) {
  setFeedback(result.message, false);
  return;
}
```

Key conventions:
- Return `{ valid: boolean, message: string }` from validation functions.
- Use `setFeedback(message, isSuccess)` to display feedback — it targets the `aria-live="polite"` element.
- Use **guard clauses** at the top of rendering functions: `if (!container) return;`
- Mathematical edge cases: return `Infinity`, `null`, or `"—"` rather than crashing. `formatPercentage()` returns `"—"` for non-finite values; `formatLikelihood()` returns `"∞"`.
- Use `clamp(value, 0, 1)` with a `Number.isFinite()` guard before using any value as a visual proportion.

---

## CSS

- **Indentation:** 2 spaces.
- **Flat design:** no `box-shadow`. Use 2px borders and 4–8px `border-radius`.
- **Theming:** all colors are CSS custom properties. Dark mode is implemented via `[data-theme="dark"]` on `<html>` — never hard-code colors directly in rules.
- **Responsive layout:** CSS Grid with `repeat(auto-fit, minmax(...))`.
- **Motion:** always add `@media (prefers-reduced-motion: reduce)` overrides for any animation or transition you introduce.
- Keep selectors flat; avoid deep nesting.

---

## Accessibility

Maintain the existing accessibility standards:
- Use semantic HTML elements (`<header>`, `<main>`, `<section>`, `<article>`, `<fieldset>`, `<legend>`, `<details>`, `<summary>`).
- Provide `aria-labelledby` on `<section>` elements.
- New canvas elements must have an `aria-label`.
- External links must include `rel="noopener noreferrer"`.
- Feedback messages must go through the `aria-live="polite"` element — do not use `alert()`.

---

## Canvas Rendering

The Fagan nomogram uses the native Canvas 2D API:
- Always scale for device pixel ratio (DPR) for sharp retina rendering.
- Read colors at draw-time from CSS custom properties:
  ```js
  const color = getComputedStyle(document.documentElement)
    .getPropertyValue('--accent-warm').trim();
  ```
  This ensures the canvas respects the active theme without extra logic.
- Redraw the canvas whenever the theme changes.

---

## Data / Datasets

New datasets are added in the `datasets` constant at the top of `script.js`:

```js
const datasets = {
  my_dataset: {
    name: "Nome do Dataset",
    tp: 0, fp: 0, fn: 0, tn: 0,
    source: "Referência bibliográfica completa.",
    year: 2024,
  },
  // ...
};
```

Add a matching `<option value="my_dataset">` in `index.html`. Dataset keys use `snake_case`.

---

## Versioning and Changelog

- Semantic versioning: `MAJOR.MINOR` (e.g., `3.1`).
- Update `CHANGELOG.md` following the Keep-a-Changelog format with date `YYYY-MM-DD`.
- Section headers in Portuguese: `### Adicionado`, `### Alterado`, `### Corrigido`, `### Técnico`.

---

## Key File Locations

| File | Purpose |
|---|---|
| `index.html` | Application markup and structure |
| `script.js` | All logic: validation, calculation, rendering, event handling |
| `styles.css` | All styles: Flexoki theme, dark mode, responsive layout |
| `CHANGELOG.md` | Version history |
| `README.md` | Project description and user instructions |
| `GUIA_RAPIDO.md` | Quick-start guide (pt-PT) |
