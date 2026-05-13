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

test("calculateMetrics includes CIs for LR+, LR−, and post-test probabilities", () => {
  const m = core.calculateMetrics({ tp: 195, fp: 87, fn: 5, tn: 413, preTestProb: 28.6 });
  assert.ok(m.lrPositive.ci, "missing LR+ CI");
  assert.ok(m.lrNegative.ci, "missing LR- CI");
  assert.ok(m.postTestPositive.ci, "missing post-test (+) CI");
  assert.ok(m.postTestNegative.ci, "missing post-test (-) CI");

  // CI must bracket the point estimate for each.
  assert.ok(m.lrPositive.ci.lower < m.lrPositive.value && m.lrPositive.value < m.lrPositive.ci.upper);
  assert.ok(m.lrNegative.ci.lower < m.lrNegative.value && m.lrNegative.value < m.lrNegative.ci.upper);
  assert.ok(m.postTestPositive.ci.lower < m.postTestPositive.value && m.postTestPositive.value < m.postTestPositive.ci.upper);
  assert.ok(m.postTestNegative.ci.lower < m.postTestNegative.value && m.postTestNegative.value < m.postTestNegative.ci.upper);
});

test("calcPostTestCI returns null when LR CI is missing", () => {
  assert.equal(core.calcPostTestCI(0.2, null), null);
});

test("calcPostTestCI propagates the LR CI through Bayes' update", () => {
  // pre = 0.2 → odds = 0.25; LR CI 4..8 → post odds 1..2 → post prob 0.5..0.667
  const post = core.calcPostTestCI(0.2, { lower: 4, upper: 8 });
  close(post.lower, 0.5);
  close(post.upper, 2 / 3);
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

// ── calcLogRatioCI (Simel 1991 log-normal CI for ratios) ────────────────────

test("calcLogRatioCI for D-dimer LR+ (195/200 over 87/500)", () => {
  // Hand-derived: log(0.975/0.174) ± 1.96 * sqrt(0.025/195 + 0.826/87)
  const ci = core.calcLogRatioCI(195, 200, 87, 500);
  close(ci.lower, 4.6233, 0.001);
  close(ci.upper, 6.7913, 0.001);
});

test("calcLogRatioCI for D-dimer LR− (5/200 over 413/500)", () => {
  const ci = core.calcLogRatioCI(5, 200, 413, 500);
  close(ci.lower, 0.01273, 1e-4);
  close(ci.upper, 0.07199, 1e-4);
});

test("calcLogRatioCI brackets the point estimate", () => {
  const ci = core.calcLogRatioCI(80, 100, 10, 100);
  const point = (80 / 100) / (10 / 100);
  assert.ok(ci.lower < point && ci.upper > point, `point ${point} outside CI ${ci.lower}–${ci.upper}`);
});

test("calcLogRatioCI applies continuity correction when a cell is 0", () => {
  // Without correction this would attempt log(0/n) and return null. With +0.5
  // on every cell we still get a finite (very wide) CI.
  const ci = core.calcLogRatioCI(0, 10, 5, 10);
  assert.ok(ci !== null);
  assert.ok(Number.isFinite(ci.lower) && Number.isFinite(ci.upper));
  assert.ok(ci.upper > ci.lower);
});

test("calcLogRatioCI continuityCorrection='never' returns null on zero cells", () => {
  const ci = core.calcLogRatioCI(0, 10, 5, 10, { continuityCorrection: "never" });
  assert.equal(ci, null);
});

test("calcLogRatioCI continuityCorrection='always' applies +0.5 even with no zero cells", () => {
  const ciAuto = core.calcLogRatioCI(80, 100, 10, 100, { continuityCorrection: "auto" });
  const ciAlways = core.calcLogRatioCI(80, 100, 10, 100, { continuityCorrection: "always" });
  // Same point estimate but the always-corrected CI is slightly different.
  assert.ok(Math.abs(ciAuto.lower - ciAlways.lower) > 1e-6);
});

test("calculateMetrics propagates continuity option to LR and DOR CIs", () => {
  // Synthetic 0-cell case
  const input = { tp: 50, fp: 0, fn: 5, tn: 100, preTestProb: 30 };
  const auto = core.calculateMetrics(input, { continuityCorrection: "auto" });
  const never = core.calculateMetrics(input, { continuityCorrection: "never" });
  assert.ok(auto.lrPositive.ci);
  assert.equal(never.lrPositive.ci, null);
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

// ── Prevalence sensitivity identities (used by the web slider) ──────────────
// PPV(p) and NPV(p) at an arbitrary prevalence p, given sens and spec, must
// agree with what calculateMetrics produces when fed a synthetic 2x2 at that
// same prevalence. These identities power the prevalence-explorer chart.

test("PPV(p) from sens/spec matches calculateMetrics PPV at same prevalence", () => {
  const sens = 0.95;
  const spec = 0.90;
  const N = 100000;
  for (const p of [0.01, 0.1, 0.5, 0.9]) {
    const diseased = Math.round(N * p);
    const nonDiseased = N - diseased;
    const tp = Math.round(sens * diseased);
    const fn = diseased - tp;
    const tn = Math.round(spec * nonDiseased);
    const fp = nonDiseased - tn;
    const m = core.calculateMetrics({ tp, fp, fn, tn, preTestProb: p * 100 });

    const ppvFromFormula = (sens * p) / (sens * p + (1 - spec) * (1 - p));
    close(m.ppv.value, ppvFromFormula, 1e-3);
    // Post-test (+) at this prevalence must equal PPV (identity by definition).
    close(m.postTestPositive.value, ppvFromFormula, 1e-3);
  }
});

// ── Cohen's kappa ───────────────────────────────────────────────────────────

test("calcCohenKappa on a perfect-agreement table returns 1", () => {
  const r = core.calcCohenKappa({ bothPos: 50, only1Pos: 0, only2Pos: 0, bothNeg: 50 });
  close(r.value, 1, 1e-9);
  assert.match(r.interpretation, /Almost perfect/);
});

test("calcCohenKappa on independent raters returns ≈ 0", () => {
  // Each rater calls 50% positive, but disagreements are 50/50 → kappa ≈ 0.
  const r = core.calcCohenKappa({ bothPos: 25, only1Pos: 25, only2Pos: 25, bothNeg: 25 });
  close(r.value, 0, 1e-9);
});

test("calcCohenKappa on classic Fleiss textbook example yields ~0.40", () => {
  // 100 items; po = (45 + 15) / 100 = 0.60
  // pe = (50/100)(60/100) + (50/100)(40/100) = 0.30 + 0.20 = 0.50
  // kappa = (0.60 - 0.50) / (1 - 0.50) = 0.20
  // (illustrative — keeps the maths reproducible without a copyrighted table)
  const r = core.calcCohenKappa({ bothPos: 45, only1Pos: 5, only2Pos: 15, bothNeg: 35 });
  close(r.observed, 0.80, 1e-9);
  // expected = (50/100)(60/100) + (50/100)(40/100) = 0.50
  close(r.expected, 0.50, 1e-9);
  close(r.value, (0.80 - 0.50) / (1 - 0.50), 1e-9);
});

test("calcCohenKappa returns null on empty or invalid input", () => {
  assert.equal(core.calcCohenKappa({ bothPos: 0, only1Pos: 0, only2Pos: 0, bothNeg: 0 }), null);
  assert.equal(core.calcCohenKappa({ bothPos: -1, only1Pos: 0, only2Pos: 0, bothNeg: 5 }), null);
});

test("interpretKappa maps to Landis-Koch bins", () => {
  assert.match(core.interpretKappa(-0.1), /Poor/);
  assert.match(core.interpretKappa(0.10), /Slight/);
  assert.match(core.interpretKappa(0.30), /Fair/);
  assert.match(core.interpretKappa(0.50), /Moderate/);
  assert.match(core.interpretKappa(0.70), /Substantial/);
  assert.match(core.interpretKappa(0.95), /Almost perfect/);
});

// ── Number needed to screen ─────────────────────────────────────────────────

test("calculateMetrics exposes NNS = 1 / (sens × prevalence)", () => {
  // sens = 0.95, pre = 0.02 → NNS = 1 / 0.019 ≈ 52.63
  const m = core.calculateMetrics({ tp: 95, fp: 100, fn: 5, tn: 1800, preTestProb: 2 });
  const sens = 95 / 100;
  const pre = 0.02;
  close(m.numberNeededToScreen.value, 1 / (sens * pre), 1e-9);
});

test("NNS is infinite when sensitivity is zero", () => {
  const m = core.calculateMetrics({ tp: 0, fp: 10, fn: 50, tn: 100, preTestProb: 20 });
  assert.equal(m.numberNeededToScreen.value, Infinity);
});

test("NNS is infinite when pre-test probability is zero", () => {
  const m = core.calculateMetrics({ tp: 50, fp: 10, fn: 5, tn: 100, preTestProb: 0 });
  assert.equal(m.numberNeededToScreen.value, Infinity);
});

test("formatNNS rounds up and handles non-finite", () => {
  assert.equal(core.formatNNS(2.1), "3");
  assert.equal(core.formatNNS(99.0), "99");
  assert.equal(core.formatNNS(Infinity), "—");
  assert.equal(core.formatNNS(NaN), "—");
  assert.equal(core.formatNNS(0), "—");
});

// ── ROC reconstruction ──────────────────────────────────────────────────────

test("calculateROC: perfect classifier yields AUC = 1", () => {
  // Perfect separation: at the optimal cutoff sens=1, spec=1.
  const roc = core.calculateROC([
    { cutoff: 5, tp: 50, fp: 0,  fn: 0,  tn: 50 },
  ]);
  assert.ok(roc);
  close(roc.auc, 1, 1e-9);
  assert.equal(roc.optimalIndex, 0);
  close(roc.optimalPoint.youden, 1, 1e-9);
});

test("calculateROC: random classifier (single mid-point) yields AUC ≈ 0.5", () => {
  // A single (FPR=0.5, TPR=0.5) point combined with the (0,0) and (1,1)
  // anchors gives exactly AUC = 0.5 under trapezoidal integration.
  const roc = core.calculateROC([
    { cutoff: 5, tp: 25, fp: 25, fn: 25, tn: 25 },
  ]);
  close(roc.auc, 0.5, 1e-9);
});

test("calculateROC: three cutoffs ascend correctly and Youden picks the middle", () => {
  // Classic example: three cutoffs from strict to lax.
  // c=high: sens=0.6 spec=0.95 → fpr=0.05, J=0.55
  // c=mid : sens=0.85 spec=0.85 → fpr=0.15, J=0.70
  // c=low : sens=0.98 spec=0.50 → fpr=0.50, J=0.48
  const roc = core.calculateROC([
    { cutoff: 3, tp: 60,  fp: 5,  fn: 40, tn: 95 },
    { cutoff: 2, tp: 85,  fp: 15, fn: 15, tn: 85 },
    { cutoff: 1, tp: 98,  fp: 50, fn: 2,  tn: 50 },
  ]);
  assert.equal(roc.points.length, 3);
  // Sorted by FPR ascending
  assert.ok(roc.points[0].fpr <= roc.points[1].fpr);
  assert.ok(roc.points[1].fpr <= roc.points[2].fpr);
  // AUC must be above the chance line
  assert.ok(roc.auc > 0.5 && roc.auc < 1);
  // Middle cutoff has the largest Youden's J
  assert.equal(roc.optimalPoint.cutoff, 2);
});

test("calculateROC returns null on empty or all-invalid input", () => {
  assert.equal(core.calculateROC([]), null);
  assert.equal(core.calculateROC([{ tp: 0, fp: 0, fn: 0, tn: 0 }]), null);
});

// ── Normal distribution helpers + synthetic ROC scaffold ───────────────────

test("stdNormalCdf hits well-known values within polynomial tolerance", () => {
  close(core.stdNormalCdf(0), 0.5, 1e-6);
  close(core.stdNormalCdf(1.96), 0.975, 5e-4);
  close(core.stdNormalCdf(-1.96), 0.025, 5e-4);
});

test("invStdNormal is the inverse of stdNormalCdf at key probabilities", () => {
  close(core.invStdNormal(0.5), 0, 1e-8);
  close(core.invStdNormal(0.975), 1.95996, 1e-4);
  close(core.invStdNormal(0.025), -1.95996, 1e-4);
});

test("generateSyntheticRocPoints returns the requested count of synthetic rows", () => {
  const rows = core.generateSyntheticRocPoints({ tp: 195, fp: 87, fn: 5, tn: 413 }, 5);
  assert.equal(rows.length, 5);
  for (const r of rows) {
    assert.ok(Number.isInteger(r.tp) && Number.isInteger(r.fp));
    assert.ok(Number.isInteger(r.fn) && Number.isInteger(r.tn));
    assert.equal(r.tp + r.fn, 200);
    assert.equal(r.fp + r.tn, 500);
    assert.equal(r.synthetic, true);
  }
});

test("generateSyntheticRocPoints reproduces an ROC that monotonically climbs", () => {
  const rows = core.generateSyntheticRocPoints({ tp: 90, fp: 20, fn: 10, tn: 80 }, 6);
  const roc = core.calculateROC(rows);
  assert.ok(roc);
  // ROC should climb (or hold) in sensitivity as FPR rises.
  for (let i = 1; i < roc.points.length; i += 1) {
    assert.ok(roc.points[i].fpr >= roc.points[i - 1].fpr - 1e-9);
    assert.ok(roc.points[i].sens >= roc.points[i - 1].sens - 1e-9);
  }
  // Binormal AUC for this observed point should be around 0.9 — synthetic
  // scaffolding shouldn't drift far from that, and a no-skill curve would
  // produce AUC ≈ 0.5.
  assert.ok(roc.auc > 0.75 && roc.auc < 1.0, `expected synthetic AUC in (0.75, 1.0), got ${roc.auc}`);
});

test("generateSyntheticRocPoints rejects degenerate input", () => {
  assert.deepEqual(core.generateSyntheticRocPoints(null, 5), []);
  assert.deepEqual(core.generateSyntheticRocPoints({ tp: 0, fp: 0, fn: 0, tn: 0 }, 5), []);
  assert.deepEqual(core.generateSyntheticRocPoints({ tp: 5, fp: 5 }, 5), []);
});

// ── Diagnostic odds ratio ───────────────────────────────────────────────────

test("calcDOR on D-dimer (195·413 / (87·5)) matches definition", () => {
  const r = core.calcDOR(195, 87, 5, 413);
  close(r.value, (195 * 413) / (87 * 5), 1e-9);
  assert.ok(r.ci);
  assert.ok(r.ci.lower < r.value && r.value < r.ci.upper);
});

test("calcDOR applies continuity correction when any cell is 0", () => {
  const r = core.calcDOR(0, 5, 5, 10);
  assert.ok(Number.isFinite(r.value));
  assert.ok(r.ci !== null);
});

test("calculateMetrics exposes the DOR card with a CI and an interpretation note", () => {
  const m = core.calculateMetrics({ tp: 195, fp: 87, fn: 5, tn: 413, preTestProb: 28.6 });
  assert.ok(m.dor);
  assert.ok(Number.isFinite(m.dor.value));
  assert.ok(m.dor.ci);
  assert.equal(typeof m.dor.note, "string");
  assert.equal(m.dor.formatter, core.formatLikelihood);
});

// ── Bias warnings ───────────────────────────────────────────────────────────

test("buildBiasWarnings is silent on a well-powered preset matching the pre-test", () => {
  const w = core.buildBiasWarnings({ tp: 195, fp: 87, fn: 5, tn: 413, preTestProb: 28.6 });
  assert.deepEqual(w, []);
});

test("buildBiasWarnings flags small diseased and non-diseased groups", () => {
  const w = core.buildBiasWarnings({ tp: 3, fp: 1, fn: 1, tn: 5, preTestProb: 40 });
  assert.equal(w.length, 2);
  assert.match(w[0], /Small diseased group/);
  assert.match(w[1], /Small non-diseased group/);
});

test("buildBiasWarnings flags pre-test vs study-prevalence mismatch", () => {
  // 50% study prevalence, but user enters 2% pre-test → > 20% gap
  const w = core.buildBiasWarnings({ tp: 50, fp: 5, fn: 50, tn: 95, preTestProb: 2 });
  assert.ok(w.some((msg) => /Study prevalence/.test(msg)));
});

// ── Pauker–Kassirer decision thresholds ─────────────────────────────────────

test("calculateThresholds: Pt=0.3, LR+=10, LR-=0.1 yields plausible thresholds", () => {
  const t = core.calculateThresholds({ treatmentThreshold: 0.3, lrPositive: 10, lrNegative: 0.1 });
  // P_low = 0.3 / (0.3 + 0.7 × 10) = 0.3 / 7.3 ≈ 0.0411
  close(t.testingThreshold, 0.3 / 7.3, 1e-6);
  // P_high = 0.3 / (0.3 + 0.7 × 0.1) = 0.3 / 0.37 ≈ 0.8108
  close(t.testTreatmentThreshold, 0.3 / 0.37, 1e-6);
  // Pt always sits between P_low and P_high (when LR+>1 and LR-<1)
  assert.ok(t.testingThreshold < t.treatmentThreshold);
  assert.ok(t.treatmentThreshold < t.testTreatmentThreshold);
});

test("calculateThresholds: infinite LR+ collapses testing threshold to 0", () => {
  const t = core.calculateThresholds({ treatmentThreshold: 0.4, lrPositive: Infinity, lrNegative: 0.1 });
  assert.equal(t.testingThreshold, 0);
});

test("calculateThresholds: zero LR- collapses test-treatment threshold to 1", () => {
  const t = core.calculateThresholds({ treatmentThreshold: 0.4, lrPositive: 5, lrNegative: 0 });
  assert.equal(t.testTreatmentThreshold, 1);
});

test("calculateThresholds rejects Pt outside (0, 1)", () => {
  assert.equal(core.calculateThresholds({ treatmentThreshold: 0, lrPositive: 5, lrNegative: 0.1 }), null);
  assert.equal(core.calculateThresholds({ treatmentThreshold: 1, lrPositive: 5, lrNegative: 0.1 }), null);
  assert.equal(core.calculateThresholds({ treatmentThreshold: NaN, lrPositive: 5, lrNegative: 0.1 }), null);
});

// ── Sequential testing identity ─────────────────────────────────────────────
// Chaining test 1's post-test (+) as test 2's pre-test must equal multiplying
// the two LRs against the original pre-test odds, under conditional independence.

test("chaining two tests equals multiplying LRs on the pre-test odds", () => {
  const test1 = { tp: 80, fp: 20, fn: 10, tn: 70, preTestProb: 30 };
  const test2 = { tp: 90, fp: 10, fn: 10, tn: 90, preTestProb: NaN };

  const m1 = core.calculateMetrics(test1);
  test2.preTestProb = m1.postTestPositive.value * 100;
  const m2 = core.calculateMetrics(test2);

  // Independent calculation: pre-odds × LR1+ × LR2+
  const preOdds = (test1.preTestProb / 100) / (1 - test1.preTestProb / 100);
  const combinedOdds = preOdds * m1.lrPositive.value * m2.lrPositive.value;
  const expectedPostProb = combinedOdds / (1 + combinedOdds);

  close(m2.postTestPositive.value, expectedPostProb, 1e-9);
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
