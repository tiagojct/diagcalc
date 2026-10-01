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
| `calcCohenKappa` | `({ bothPos, only1Pos, only2Pos, bothNeg })` | `{ value, ci, observed, expected, n, interpretation }` or `null`. Marginal-adjusted multinomial asymptotic variance; Landis–Koch 1977 label. |
| `buildBiasWarnings` | `({ tp, fp, fn, tn, preTestProb })` | `string[]` — heuristic flags for small N and study-vs-patient prevalence mismatch. |

### CI helpers

| Export | Signature | Notes |
|---|---|---|
| `calcWilsonInterval` | `(successes, total)` | Wilson 95% interval for a proportion. Returns `null` if `total === 0`. |
| `calcLogRatioCI` | `(x1, n1, x2, n2, opts?)` | Log-normal 95% CI for a ratio of two binomial proportions (Simel–Samsa–Matchar 1991). `opts.continuityCorrection` controls the +0.5 adjustment. |
| `calcPostTestCI` | `(preTestProbability, lrCi)` | Propagates an LR CI to a post-test probability CI via the Bayes update (monotonic transformation of both interval endpoints, holding the prior fixed). |
| `calcDOR` | `(tp, fp, fn, tn, opts?)` | DOR with log-normal CI; continuity correction governed by `opts.continuityCorrection`. |

### Maths primitives

| Export | What |
|---|---|
| `calculateRatio(a, b)` | `0/0 → NaN`, `n/0 → Infinity`, else `a/b`. |
| `calculateOdds(p)` | `p / (1 − p)`; handles `0`/`1` edges. |
| `multiplyOdds(odds, ratio)` | `0 × ∞` and `∞ × 0` remain `NaN`; valid infinite products remain `Infinity`. |
| `probabilityFromOdds(odds)` | Converts back to a probability; handles `0` and `∞`. |
| `clamp(value, min, max)` | Standard clamp. |

### Formatters & interpretation

| Export | Behaviour |
|---|---|
| `formatValue(value, customFormatter?)` | Routes to `customFormatter` if provided; else `formatPercentage`. |
| `formatPercentage(value)` | `"12.3%"` for finite fractions; `"—"` for non-finite. |
| `formatLikelihood(value)` | `"12.3"` for `≥ 10`, `"1.23"` otherwise. `"∞"` for positive infinity, `"—"` for undefined values, `"0"` for zero. |
| `formatNNS(value)` | `Math.ceil(value)` as a string; `"—"` for non-finite or `≤ 0`. |
| `buildProbabilityBar(value, width)` | ASCII bar `"###---"`. |
| `interpretLRPositive`, `interpretLRNegative`, `interpretDOR`, `interpretNNS`, `interpretKappa`, `buildSensitivityNote`, `buildSpecificityNote` | Plain-English notes for the matching metric. |

### Input parsers

| Export | Behaviour |
|---|---|
| `safeParseInt(value)` | Strict non-negative integer parse from a string; `NaN` on anything else. |
| `normaliseDecimal(value)` | Replaces `,` with `.` and trims. Used for pre-test probability input. |

## `diagcalc-datasets.js`

UMD module exporting `{ datasets, getDataset, listDatasets, buildDatasetWarnings }`. Each preset has:

```js
{
  tp, fp, fn, tn,        // integers
  preTestProb,           // 0–100, inclusive
  name,                  // display label
  description,           // short prose
  referenceLastReviewed: "YYYY-MM-DD", // background reference review only
  provenance: { kind: "illustrative", /* see docs/PROVENANCE.md */ },
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

- Calculation entry points guard invalid inputs; interface parsers reject incomplete strings. Counts and total must be safe integers, both disease cohorts present.
- Non-throwing: edge cases return `Infinity`, `0`, `NaN`, or `null` rather than raising.
- The UMD wrapper is load-bearing — do not convert to ES modules or CommonJS-only.


## Data and presentation separation

`calculateResults(input, options)` returns numeric metric records (`value`, optional `ci`, `unit`, interpretation id/params) or null on invalid input/options. It has no label text or formatter functions. `calculateMetrics(input, options, locale)` remains the compatibility adapter, using `diagcalc-presentation.js` to decorate numeric records. The shared types are in `diagcalc-types.d.ts`; `npm run typecheck` checks shared APIs and extracted helpers incrementally.

`parseProbability(string)` accepts complete dot/comma decimal strings. Exact 0%/100% priors are valid; an impossible observed event produces undefined posterior and no CI. `chainedPreTestProbability(fraction)` preserves precision and returns NaN for undefined input.

`validateRocRows(rows, { direction })` rejects partial/invalid data, mixed cohorts, inconsistent cutoff direction and non-monotonic operating points. `calculateROC` orders tied false-positive rates by sensitivity. Threshold calculations return null unless LR+ > 1 and 0 ≤ LR− < 1.

`diagcalc-case.js` creates schema-2 snapshots with engine version, inputs, correction options, case origin and full-precision encoded metrics. Exceptional values use `{ value: null, status }`; CI endpoints use the same encoding. History parsing limits size/count, rejects malformed entries and marks recomputed pre-schema entries legacy. Method metadata describes the selected correction rather than a fixed default.

`diagcalc-storage.js` guards backend access and preserves session writes when storage is blocked/full. `diagcalc-geometry.js` provides calibrated logarithmic Fagan coordinates with explicit off-scale flags. `diagcalc-meta.js` is the shared version/schema metadata.
