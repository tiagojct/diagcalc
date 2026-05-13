# diagcalc engine — `lib/`

This directory contains the shared calculation engine that powers all three diagcalc interfaces (web, TUI, CLI). The wrappers use a UMD-style export, so the same files load as `<script>` tags in the browser (`window.DiagcalcCore`, `window.DiagcalcDatasets`) and via `require()` in Node.

Keep this folder free of any browser-only code (no `window`, no DOM access). Interfaces consume the exports and render them.

## `diagcalc-core.js`

### Calculation

| Export | Signature | Returns |
|---|---|---|
| `validateInputs` | `({ tp, fp, fn, tn, preTestProb })` | `{ valid: boolean, message?: string }` — non-throwing input gate |
| `calculateMetrics` | `({ tp, fp, fn, tn, preTestProb }, opts?)` | Object of metric cards: `sensitivity`, `specificity`, `ppv`, `npv`, `dor`, `numberNeededToScreen`, `lrPositive`, `lrNegative`, `preTestProbability`, `postTestPositive`, `postTestNegative`. Each has `{ label, value, ci?, formatter?, note? }`. `opts.continuityCorrection` is `"auto"` (default) \| `"always"` \| `"never"`. |
| `calculateThresholds` | `({ treatmentThreshold, lrPositive, lrNegative })` | `{ treatmentThreshold, testingThreshold, testTreatmentThreshold }` or `null`. Pauker–Kassirer 1980 framework. |
| `calculateROC` | `(rows)` | `{ points, auc, optimalIndex, optimalPoint }` or `null`. Trapezoidal AUC with `(0,0)` and `(1,1)` anchors; Youden's J optimum. |
| `calcCohenKappa` | `({ bothPos, only1Pos, only2Pos, bothNeg })` | `{ value, ci, observed, expected, n, interpretation }` or `null`. Fleiss 1969 variance; Landis–Koch 1977 label. |
| `buildBiasWarnings` | `({ tp, fp, fn, tn, preTestProb })` | `string[]` — heuristic flags for small N and study-vs-patient prevalence mismatch. |

### CI helpers

| Export | Signature | Notes |
|---|---|---|
| `calcWilsonInterval` | `(successes, total)` | Wilson 95% interval for a proportion. Returns `null` if `total === 0`. |
| `calcLogRatioCI` | `(x1, n1, x2, n2, opts?)` | Log-normal 95% CI for a ratio of two binomial proportions (Simel–Samsa–Matchar 1991). `opts.continuityCorrection` controls the +0.5 adjustment. |
| `calcPostTestCI` | `(preTestProbability, lrCi)` | Propagates an LR CI to a post-test probability CI via the Bayes update (delta method on the log-LR scale). |
| `calcDOR` | `(tp, fp, fn, tn, opts?)` | DOR with log-normal CI; continuity correction governed by `opts.continuityCorrection`. |

### Maths primitives

| Export | What |
|---|---|
| `calculateRatio(a, b)` | `0/0 → NaN`, `n/0 → Infinity`, else `a/b`. |
| `calculateOdds(p)` | `p / (1 − p)`; handles `0`/`1` edges. |
| `multiplyOdds(odds, ratio)` | `0 × anything → 0`; infinite operand → `Infinity`. |
| `probabilityFromOdds(odds)` | Converts back to a probability; handles `0` and `∞`. |
| `clamp(value, min, max)` | Standard clamp. |

### Formatters & interpretation

| Export | Behaviour |
|---|---|
| `formatValue(value, customFormatter?)` | Routes to `customFormatter` if provided; else `formatPercentage`. |
| `formatPercentage(value)` | `"12.3%"` for finite fractions; `"—"` for non-finite. |
| `formatLikelihood(value)` | `"12.3"` for `≥ 10`, `"1.23"` otherwise. `"∞"` for non-finite, `"0"` for zero. |
| `formatNNS(value)` | `Math.ceil(value)` as a string; `"—"` for non-finite or `≤ 0`. |
| `buildProbabilityBar(value, width)` | ASCII bar `"###---"`. |
| `interpretLRPositive`, `interpretLRNegative`, `interpretDOR`, `interpretNNS`, `interpretKappa`, `buildSensitivityNote`, `buildSpecificityNote` | Plain-English notes for the matching metric. |

### Input parsers

| Export | Behaviour |
|---|---|
| `safeParseInt(value)` | Strict non-negative integer parse from a string; `NaN` on anything else. |
| `normaliseDecimal(value)` | Replaces `,` with `.` and trims. Used for pre-test probability input. |

## `diagcalc-datasets.js`

UMD module exporting `{ datasets, getDataset, listDatasets }`. Each preset has:

```js
{
  tp, fp, fn, tn,        // integers
  preTestProb,           // 0–100, exclusive of 100
  name,                  // display label
  description,           // short prose
  lastReviewed: "YYYY-MM-DD",   // present on every literature-backed preset
  reference: null | {    // null on generic teaching scenarios
    authors,
    title,
    journal,
    doi,
    url,
  },
}
```

Adding a preset: insert it in `datasets`, add a matching `<option value="<key>">` in `index.html`. The TUI and CLI pick it up automatically via `listDatasets()`.

## Engine-level invariants

- `validateInputs` is the only function that judges user input; everything else trusts its caller.
- Non-throwing: edge cases return `Infinity`, `0`, `NaN`, or `null` rather than raising.
- The UMD wrapper is load-bearing — do not convert to ES modules or CommonJS-only.
