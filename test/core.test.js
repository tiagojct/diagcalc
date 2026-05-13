"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../lib/diagcalc-core");
const datasetStore = require("../lib/diagcalc-datasets");

// Tolerances chosen wide enough to allow 64-bit FP drift but tight enough to catch real regressions.
const ABS_TOL = 1e-9;
const REL_TOL = 1e-6;

function close(actual, expected, tol = ABS_TOL) {
  if (Number.isNaN(expected)) {
    return assert.ok(Number.isNaN(actual), `expected NaN, got ${actual}`);
  }
  if (!Number.isFinite(expected)) {
    return assert.equal(actual, expected);
  }
  const delta = Math.abs(actual - expected);
  const allowed = Math.max(tol, Math.abs(expected) * REL_TOL);
  assert.ok(delta <= allowed, `expected ${expected} ± ${allowed}, got ${actual} (Δ=${delta})`);
}

// ── validateInputs ─────────────────────────────────────────────────────────

test("validateInputs accepts a normal case", () => {
  const result = core.validateInputs({ tp: 10, fp: 2, fn: 1, tn: 87, preTestProb: 10 });
  assert.equal(result.valid, true);
});

test("validateInputs rejects negative cells", () => {
  const result = core.validateInputs({ tp: -1, fp: 2, fn: 1, tn: 87, preTestProb: 10 });
  assert.equal(result.valid, false);
  assert.match(result.message, /non-negative/);
});

test("validateInputs rejects non-integer cells", () => {
  const result = core.validateInputs({ tp: 1.5, fp: 2, fn: 1, tn: 87, preTestProb: 10 });
  assert.equal(result.valid, false);
  assert.match(result.message, /whole numbers/);
});

test("validateInputs rejects NaN pre-test probability", () => {
  const result = core.validateInputs({ tp: 10, fp: 2, fn: 1, tn: 87, preTestProb: NaN });
  assert.equal(result.valid, false);
});

test("validateInputs accepts pre-test = 0", () => {
  const result = core.validateInputs({ tp: 10, fp: 2, fn: 1, tn: 87, preTestProb: 0 });
  assert.equal(result.valid, true);
});

test("validateInputs accepts pre-test just below 100", () => {
  const result = core.validateInputs({ tp: 10, fp: 2, fn: 1, tn: 87, preTestProb: 99.9999 });
  assert.equal(result.valid, true);
});

test("validateInputs rejects pre-test = 100 with the [0, 100) message", () => {
  const result = core.validateInputs({ tp: 10, fp: 2, fn: 1, tn: 87, preTestProb: 100 });
  assert.equal(result.valid, false);
  assert.match(result.message, /below 100%/);
});

test("validateInputs flags indeterminate sensitivity when no diseased cases", () => {
  const result = core.validateInputs({ tp: 0, fp: 5, fn: 0, tn: 95, preTestProb: 5 });
  assert.equal(result.valid, false);
  assert.match(result.message, /Sensitivity/);
});

test("validateInputs flags indeterminate specificity when no non-diseased cases", () => {
  const result = core.validateInputs({ tp: 5, fp: 0, fn: 5, tn: 0, preTestProb: 50 });
  assert.equal(result.valid, false);
  assert.match(result.message, /Specificity/);
});

// ── calculateMetrics: HIV ELISA golden values ───────────────────────────────
// Reference dataset: 4th-gen HIV ELISA (preset). Values are reproducible by hand
// and match the implementation's CLI output at v3.2.4.

test("calculateMetrics on HIV ELISA preset", () => {
  const m = core.calculateMetrics({ tp: 199, fp: 1, fn: 1, tn: 9799, preTestProb: 2 });

  close(m.sensitivity.value, 199 / 200);              // 0.995
  close(m.specificity.value, 9799 / 9800);            // ≈ 0.99989796
  close(m.ppv.value, 199 / 200);                      // 0.995
  close(m.npv.value, 9799 / 9800);                    // ≈ 0.99989796
  close(m.lrPositive.value, 9751);                    // 0.995 × 9800
  close(m.lrNegative.value, 49 / 9799, 1e-7);         // ≈ 0.005000510

  // Wilson CI for sens = 199/200 (Newcombe-style reference)
  close(m.sensitivity.ci.lower, 0.97222560, 1e-5);
  close(m.sensitivity.ci.upper, 0.99911685, 1e-5);

  // Post-test prob (+) at pre = 2% should be 99.5% (symmetry: pre and sens identical)
  close(m.postTestPositive.value, 0.995, 1e-6);
  // Post-test prob (-) at pre = 2% ≈ 1/9800
  close(m.postTestNegative.value, 1 / 9800, 1e-6);
});

// ── calculateMetrics: D-dimer golden values ─────────────────────────────────

test("calculateMetrics on D-dimer preset", () => {
  const m = core.calculateMetrics({ tp: 195, fp: 87, fn: 5, tn: 413, preTestProb: 28.6 });

  close(m.sensitivity.value, 195 / 200);   // 0.975
  close(m.specificity.value, 413 / 500);   // 0.826
  close(m.ppv.value, 195 / 282);           // ≈ 0.6915
  close(m.npv.value, 413 / 418);           // ≈ 0.98804
  close(m.lrPositive.value, (195 / 200) / (87 / 500));   // ≈ 5.6034
  close(m.lrNegative.value, (5 / 200) / (413 / 500));    // ≈ 0.03027
});

// ── Wilson CI properties ────────────────────────────────────────────────────

test("calcWilsonInterval brackets the point estimate", () => {
  const ci = core.calcWilsonInterval(40, 100);
  assert.ok(ci.lower < 0.4 && ci.upper > 0.4);
  assert.ok(ci.lower >= 0 && ci.upper <= 1);
});

test("calcWilsonInterval handles a 0/N boundary without crashing", () => {
  const ci = core.calcWilsonInterval(0, 20);
  assert.equal(ci.lower, 0);
  assert.ok(ci.upper > 0 && ci.upper < 1);
});

test("calcWilsonInterval handles a N/N boundary", () => {
  const ci = core.calcWilsonInterval(20, 20);
  // Upper hits 1 in theory; allow FP-near-1 from the Wilson formula.
  assert.ok(ci.upper >= 0.999 && ci.upper <= 1, `upper out of band: ${ci.upper}`);
  assert.ok(ci.lower > 0 && ci.lower < 1);
});

test("calcWilsonInterval returns null on zero total (avoid divide-by-zero)", () => {
  assert.equal(core.calcWilsonInterval(0, 0), null);
});

// ── Ratio / odds helpers ────────────────────────────────────────────────────

test("calculateRatio(0, 0) is NaN (regression: v3.2.4 bug B)", () => {
  assert.ok(Number.isNaN(core.calculateRatio(0, 0)));
});

test("calculateRatio handles ordinary ratios", () => {
  close(core.calculateRatio(0.95, 0.05), 19);
});

test("calculateRatio returns Infinity when only the denominator is 0", () => {
  assert.equal(core.calculateRatio(0.5, 0), Infinity);
});

test("calculateRatio returns 0 when only the numerator is 0", () => {
  assert.equal(core.calculateRatio(0, 0.5), 0);
});

test("calculateOdds at boundaries", () => {
  assert.equal(core.calculateOdds(0), 0);
  assert.equal(core.calculateOdds(1), Infinity);
  close(core.calculateOdds(0.5), 1);
});

test("multiplyOdds absorbs 0 even with infinite ratio", () => {
  // Pragmatic choice: 0 × ∞ → 0 (low prior remains low)
  assert.equal(core.multiplyOdds(0, Infinity), 0);
  assert.equal(core.multiplyOdds(Infinity, 0), 0);
});

test("probabilityFromOdds round-trips with calculateOdds", () => {
  for (const p of [0.05, 0.18, 0.5, 0.83, 0.95]) {
    close(core.probabilityFromOdds(core.calculateOdds(p)), p);
  }
});

// ── Formatters ──────────────────────────────────────────────────────────────

test("formatPercentage formats a finite fraction", () => {
  assert.equal(core.formatPercentage(0.18), "18.0%");
  assert.equal(core.formatPercentage(1), "100.0%");
  assert.equal(core.formatPercentage(0), "0.0%");
});

test("formatPercentage handles non-finite values", () => {
  assert.equal(core.formatPercentage(NaN), "—");
  assert.equal(core.formatPercentage(Infinity), "—");
  assert.equal(core.formatPercentage(-Infinity), "—");
});

test("formatLikelihood uses 1 decimal at >= 10 and 2 decimals below", () => {
  assert.equal(core.formatLikelihood(12.345), "12.3");
  assert.equal(core.formatLikelihood(5.678), "5.68");
  assert.equal(core.formatLikelihood(0.01), "0.01");
});

test("formatLikelihood collapses non-finite to ∞ and 0", () => {
  assert.equal(core.formatLikelihood(Infinity), "∞");
  assert.equal(core.formatLikelihood(NaN), "∞");
  assert.equal(core.formatLikelihood(0), "0");
});

// ── Input parsers ───────────────────────────────────────────────────────────

test("safeParseInt accepts digit-only strings", () => {
  assert.equal(core.safeParseInt("42"), 42);
  assert.equal(core.safeParseInt("0"), 0);
});

test("safeParseInt rejects negatives, decimals, and garbage", () => {
  assert.ok(Number.isNaN(core.safeParseInt("-1")));
  assert.ok(Number.isNaN(core.safeParseInt("1.5")));
  assert.ok(Number.isNaN(core.safeParseInt("abc")));
  assert.ok(Number.isNaN(core.safeParseInt("")));
});

test("normaliseDecimal converts comma to dot and trims", () => {
  assert.equal(core.normaliseDecimal(" 3,14 "), "3.14");
  assert.equal(core.normaliseDecimal("7"), "7");
});

// ── buildProbabilityBar ─────────────────────────────────────────────────────

test("buildProbabilityBar fills proportionally", () => {
  assert.equal(core.buildProbabilityBar(0, 10), "----------");
  assert.equal(core.buildProbabilityBar(1, 10), "##########");
  assert.equal(core.buildProbabilityBar(0.5, 10), "#####-----");
});

test("buildProbabilityBar clamps non-finite values to 0", () => {
  assert.equal(core.buildProbabilityBar(NaN, 10), "----------");
  assert.equal(core.buildProbabilityBar(Infinity, 10), "----------");
});

// ── Datasets registry ───────────────────────────────────────────────────────

test("listDatasets exposes every preset with a key", () => {
  const all = datasetStore.listDatasets();
  assert.ok(all.length >= 10);
  for (const entry of all) {
    assert.ok(entry.key, "missing key");
    assert.ok(entry.name, "missing name");
    assert.ok(Number.isInteger(entry.tp) && entry.tp >= 0);
    assert.ok(Number.isInteger(entry.fp) && entry.fp >= 0);
    assert.ok(Number.isInteger(entry.fn) && entry.fn >= 0);
    assert.ok(Number.isInteger(entry.tn) && entry.tn >= 0);
    assert.ok(entry.preTestProb >= 0 && entry.preTestProb < 100);
  }
});

test("getDataset returns null for unknown keys", () => {
  assert.equal(datasetStore.getDataset("does_not_exist"), null);
});

test("every preset validates and computes finite metrics", () => {
  for (const preset of datasetStore.listDatasets()) {
    const v = core.validateInputs(preset);
    assert.equal(v.valid, true, `${preset.key} failed validation: ${v.message}`);
    const m = core.calculateMetrics(preset);
    assert.ok(Number.isFinite(m.sensitivity.value));
    assert.ok(Number.isFinite(m.specificity.value));
    assert.ok(m.lrPositive.value >= 0);
    assert.ok(m.lrNegative.value >= 0);
  }
});
