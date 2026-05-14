(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }

  root.DiagcalcCore = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  function validateInputs({ tp, fp, fn, tn, preTestProb }) {
    const inputs = [tp, fp, fn, tn];
    if (inputs.some((value) => Number.isNaN(value) || value < 0)) {
      return { valid: false, message: "Enter non-negative integers for all confusion matrix cells." };
    }

    if (inputs.some((value) => !Number.isInteger(value))) {
      return { valid: false, message: "Use whole numbers for TP, FP, FN, and TN." };
    }

    if (Number.isNaN(preTestProb)) {
      return { valid: false, message: "Enter a valid pre-test probability." };
    }

    if (preTestProb < 0 || preTestProb >= 100) {
      return { valid: false, message: "Pre-test probability must be at least 0% and below 100%." };
    }

    if (tp + fn === 0) {
      return { valid: false, message: "Sensitivity is indeterminate: add cases with disease (TP or FN)." };
    }

    if (tn + fp === 0) {
      return { valid: false, message: "Specificity is indeterminate: add cases without disease (TN or FP)." };
    }

    if (tp + fp === 0) {
      return { valid: false, message: "PPV is indeterminate: at least one positive test result is required." };
    }

    if (tn + fn === 0) {
      return { valid: false, message: "NPV is indeterminate: at least one negative test result is required." };
    }

    return { valid: true };
  }

  function calculateMetrics({ tp, fp, fn, tn, preTestProb }, opts) {
    const continuityMode = normaliseContinuityMode(opts && opts.continuityCorrection);
    const totals = {
      diseased: tp + fn,
      nonDiseased: tn + fp,
      positives: tp + fp,
      negatives: tn + fn,
    };

    const preTest = preTestProb / 100;
    const sensitivity = tp / totals.diseased;
    const specificity = tn / totals.nonDiseased;
    const ppv = tp / totals.positives;
    const npv = tn / totals.negatives;
    const lrPositive = calculateRatio(sensitivity, 1 - specificity);
    const lrNegative = calculateRatio(1 - sensitivity, specificity);
    const preTestOdds = calculateOdds(preTest);
    const postTestOddsPositive = multiplyOdds(preTestOdds, lrPositive);
    const postTestOddsNegative = multiplyOdds(preTestOdds, lrNegative);
    const postTestProbPositive = probabilityFromOdds(postTestOddsPositive);
    const postTestProbNegative = probabilityFromOdds(postTestOddsNegative);

    const lrPositiveCI = calcLogRatioCI(tp, totals.diseased, fp, totals.nonDiseased, { continuityCorrection: continuityMode });
    const lrNegativeCI = calcLogRatioCI(fn, totals.diseased, tn, totals.nonDiseased, { continuityCorrection: continuityMode });
    const postTestPositiveCI = calcPostTestCI(preTest, lrPositiveCI);
    const postTestNegativeCI = calcPostTestCI(preTest, lrNegativeCI);
    const dor = calcDOR(tp, fp, fn, tn, { continuityCorrection: continuityMode });
    const nns = (sensitivity > 0 && preTest > 0) ? 1 / (sensitivity * preTest) : Infinity;

    return {
      sensitivity: {
        label: "Sensitivity",
        value: sensitivity,
        ci: calcWilsonInterval(tp, totals.diseased),
        note: buildSensitivityNote(sensitivity),
      },
      specificity: {
        label: "Specificity",
        value: specificity,
        ci: calcWilsonInterval(tn, totals.nonDiseased),
        note: buildSpecificityNote(specificity),
      },
      ppv: {
        label: "Positive predictive value (PPV)",
        value: ppv,
        ci: calcWilsonInterval(tp, totals.positives),
        note: "Probability of disease given a positive result.",
      },
      npv: {
        label: "Negative predictive value (NPV)",
        value: npv,
        ci: calcWilsonInterval(tn, totals.negatives),
        note: "Probability of no disease given a negative result.",
      },
      dor: {
        label: "Diagnostic odds ratio (DOR)",
        value: dor.value,
        ci: dor.ci,
        formatter: formatLikelihood,
        note: interpretDOR(dor.value),
      },
      numberNeededToScreen: {
        label: "Number needed to screen (NNS)",
        value: nns,
        formatter: formatNNS,
        note: interpretNNS(nns),
      },
      lrPositive: {
        label: "Positive likelihood ratio (LR+)",
        value: lrPositive,
        ci: lrPositiveCI,
        formatter: formatLikelihood,
        note: interpretLRPositive(lrPositive),
      },
      lrNegative: {
        label: "Negative likelihood ratio (LR-)",
        value: lrNegative,
        ci: lrNegativeCI,
        formatter: formatLikelihood,
        note: interpretLRNegative(lrNegative),
      },
      preTestProbability: {
        label: "Pre-test probability",
        value: preTest,
        note: "Estimated starting point before the test result.",
      },
      postTestPositive: {
        label: "Post-test probability (positive result)",
        value: postTestProbPositive,
        ci: postTestPositiveCI,
        note: "Updated probability of disease after a positive test.",
      },
      postTestNegative: {
        label: "Post-test probability (negative result)",
        value: postTestProbNegative,
        ci: postTestNegativeCI,
        note: "Updated probability of disease after a negative test.",
      },
    };
  }

  function calcWilsonInterval(successes, total) {
    if (total === 0) {
      return null;
    }

    const z = 1.96;
    const phat = successes / total;
    const denominator = 1 + (z ** 2) / total;
    const center = phat + (z ** 2) / (2 * total);
    const margin = z * Math.sqrt((phat * (1 - phat) + (z ** 2) / (4 * total)) / total);
    const lower = Math.max(0, (center - margin) / denominator);
    const upper = Math.min(1, (center + margin) / denominator);
    return { lower, upper };
  }

  // 95% CI for a ratio of two binomial proportions on the log scale.
  // Used for LR+: (x1, n1) = (TP, diseased), (x2, n2) = (FP, non-diseased).
  // Used for LR-: (x1, n1) = (FN, diseased), (x2, n2) = (TN, non-diseased).
  // Simel DL, Samsa GP, Matchar DB. J Clin Epidemiol 1991;44(8):763–770.
  // Continuity correction (+0.5 on each cell) applied when any cell is 0.
  function calcLogRatioCI(x1, n1, x2, n2, opts) {
    const mode = normaliseContinuityMode(opts && opts.continuityCorrection);
    let a = x1;
    let b = n1 - x1;
    let c = x2;
    let d = n2 - x2;
    const hasZero = a === 0 || b === 0 || c === 0 || d === 0;

    if (mode === "always" || (mode === "auto" && hasZero)) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }
    // "never" mode: leave cells as-is — the existing checks below catch the
    // cases where the maths actually fails (p1 or p2 = 0).

    const tn1 = a + b;
    const tn2 = c + d;
    const p1 = a / tn1;
    const p2 = c / tn2;

    if (p1 === 0 || p2 === 0) {
      return null;
    }

    const logRatio = Math.log(p1 / p2);
    const seLog = Math.sqrt((1 - p1) / a + (1 - p2) / c);

    if (!Number.isFinite(seLog) || !Number.isFinite(logRatio)) {
      return null;
    }

    const z = 1.96;
    return {
      lower: Math.exp(logRatio - z * seLog),
      upper: Math.exp(logRatio + z * seLog),
    };
  }

  function normaliseContinuityMode(value) {
    if (value === "always" || value === "never") return value;
    return "auto";
  }

  // Cohen's kappa for inter-rater agreement on a binary outcome.
  // Inputs: the four cells of the rater1×rater2 2×2 table.
  // Returns { value, ci, observed, expected, n, interpretation } or null on
  // empty input. Fleiss (1969) variance for the CI; Landis & Koch (1977) bins
  // for the qualitative interpretation.
  function calcCohenKappa({ bothPos, only1Pos, only2Pos, bothNeg }) {
    const cells = [bothPos, only1Pos, only2Pos, bothNeg];
    if (cells.some((v) => !Number.isInteger(v) || v < 0)) return null;
    const N = bothPos + only1Pos + only2Pos + bothNeg;
    if (N === 0) return null;

    const po = (bothPos + bothNeg) / N;
    const r1Pos = (bothPos + only1Pos) / N;
    const r2Pos = (bothPos + only2Pos) / N;
    const r1Neg = (only2Pos + bothNeg) / N;
    const r2Neg = (only1Pos + bothNeg) / N;
    const pe = r1Pos * r2Pos + r1Neg * r2Neg;

    if (pe >= 1 - 1e-12) {
      return {
        value: NaN,
        ci: null,
        observed: po,
        expected: pe,
        n: N,
        interpretation: "Expected agreement is 1; kappa is undefined.",
      };
    }

    const kappa = (po - pe) / (1 - pe);
    const seKappa = Math.sqrt(po * (1 - po) / (N * (1 - pe) * (1 - pe)));
    const z = 1.96;
    return {
      value: kappa,
      ci: { lower: kappa - z * seKappa, upper: kappa + z * seKappa },
      observed: po,
      expected: pe,
      n: N,
      interpretation: interpretKappa(kappa),
    };
  }

  function interpretKappa(value) {
    if (!Number.isFinite(value)) return "Undefined";
    if (value < 0) return "Poor (less than chance)";
    if (value < 0.21) return "Slight";
    if (value < 0.41) return "Fair";
    if (value < 0.61) return "Moderate";
    if (value < 0.81) return "Substantial";
    return "Almost perfect";
  }

  // ROC reconstruction from a list of (cutoff, TP, FP, FN, TN) rows, one per
  // threshold of a continuous test. Returns the sorted points on the (FPR, TPR)
  // plane, trapezoidal AUC including the (0,0) and (1,1) anchors, and the index
  // of the row with the highest Youden's J = sens + spec − 1.
  function calculateROC(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return null;
    }

    const points = [];
    for (const row of rows) {
      const { tp, fp, fn, tn } = row;
      if (!Number.isInteger(tp) || !Number.isInteger(fp) || !Number.isInteger(fn) || !Number.isInteger(tn)) continue;
      if (tp < 0 || fp < 0 || fn < 0 || tn < 0) continue;
      if (tp + fn === 0 || tn + fp === 0) continue;
      const sens = tp / (tp + fn);
      const spec = tn / (tn + fp);
      const fpr = 1 - spec;
      points.push({
        cutoff: row.cutoff !== undefined ? row.cutoff : null,
        tp,
        fp,
        fn,
        tn,
        sens,
        spec,
        fpr,
        youden: sens + spec - 1,
      });
    }

    if (points.length === 0) return null;

    points.sort((a, b) => a.fpr - b.fpr || b.sens - a.sens);

    const augmented = [
      { fpr: 0, sens: 0 },
      ...points,
      { fpr: 1, sens: 1 },
    ];
    let auc = 0;
    for (let i = 1; i < augmented.length; i += 1) {
      const dx = augmented[i].fpr - augmented[i - 1].fpr;
      if (dx <= 0) continue;
      auc += dx * (augmented[i].sens + augmented[i - 1].sens) / 2;
    }

    let optimalIndex = -1;
    let maxYouden = -Infinity;
    for (let i = 0; i < points.length; i += 1) {
      if (points[i].youden > maxYouden) {
        maxYouden = points[i].youden;
        optimalIndex = i;
      }
    }

    return {
      points,
      auc,
      optimalIndex,
      optimalPoint: optimalIndex >= 0 ? points[optimalIndex] : null,
    };
  }

  // Standard normal CDF Φ(x). Abramowitz & Stegun 7.1.26 polynomial approximation
  // of erf; max error ~1.5e-7 — fine for ROC scaffolding.
  function stdNormalCdf(x) {
    if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return 0.5 * (1 + sign * y);
  }

  // Inverse standard normal Φ⁻¹(p) via Acklam's rational approximation.
  // Max relative error ~1.15e-9 in (0, 1).
  function invStdNormal(p) {
    if (!(p > 0 && p < 1)) {
      if (p === 0) return -Infinity;
      if (p === 1) return Infinity;
      return NaN;
    }
    const a = [-3.969683028665376e+1, 2.209460984245205e+2, -2.759285104469687e+2, 1.383577518672690e+2, -3.066479806614716e+1, 2.506628277459239e+0];
    const b = [-5.447609879822406e+1, 1.615858368580409e+2, -1.556989798598866e+2, 6.680131188771972e+1, -1.328068155288572e+1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e+0, -2.549732539343734e+0, 4.374664141464968e+0, 2.938163982698783e+0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e+0, 3.754408661907416e+0];
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q, r;
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
    if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    }
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }

  // Synthesize a scaffold of ROC cutoffs from a single observed 2×2.
  // Assumes a binormal (equal-variance) score model: scores in non-diseased
  // ~ N(0,1), in diseased ~ N(d,1). The observed sens/spec pin down d via
  // d = Φ⁻¹(sens) + Φ⁻¹(spec). Then we sweep `count` cutoffs at evenly spaced
  // FPRs in (0, 1), round the implied counts to the observed P/N totals.
  // Returns an array of { cutoff, tp, fp, fn, tn, synthetic: true } — the
  // cutoff is the implied normalized score (Φ⁻¹(1-FPR)) rounded to 2 dp.
  function generateSyntheticRocPoints(observed, count) {
    if (!observed) return [];
    const { tp, fp, fn, tn } = observed;
    if (!Number.isInteger(tp) || !Number.isInteger(fp) || !Number.isInteger(fn) || !Number.isInteger(tn)) return [];
    const P = tp + fn;
    const N = tn + fp;
    if (P <= 0 || N <= 0) return [];
    const sens = tp / P;
    const spec = tn / N;
    // Edge: a perfect (or pathological) observed point has Φ⁻¹(0) = -∞.
    // Nudge sens/spec away from 0 and 1 so d stays finite.
    const eps = 1 / (2 * Math.max(P, N));
    const sClamp = Math.min(1 - eps, Math.max(eps, sens));
    const pClamp = Math.min(1 - eps, Math.max(eps, spec));
    const d = invStdNormal(sClamp) + invStdNormal(pClamp);
    const n = Math.max(2, Math.min(20, Number.isInteger(count) ? count : 7));
    // Span (edge, 1 − edge) inclusively so the scaffolded points reach the
    // bottom-left and top-right of the ROC plot. Previous fence-post sampling
    // (i / (n + 1)) topped out around FPR 0.83 and bottomed out around 0.17,
    // leaving the corners empty.
    const edge = 0.025;
    const rows = [];
    for (let i = 0; i < n; i += 1) {
      const fpr = n === 1 ? 0.5 : edge + (1 - 2 * edge) * i / (n - 1);
      const c = invStdNormal(1 - fpr);
      const tprImplied = 1 - stdNormalCdf(c - d);
      const tpI = Math.max(0, Math.min(P, Math.round(tprImplied * P)));
      const fpI = Math.max(0, Math.min(N, Math.round(fpr * N)));
      rows.push({
        cutoff: Number(c.toFixed(2)),
        tp: tpI,
        fp: fpI,
        fn: P - tpI,
        tn: N - fpI,
        synthetic: true,
      });
    }
    return rows;
  }

  // Diagnostic odds ratio with log-normal CI.
  // DOR = (TP·TN) / (FP·FN); SE(log DOR) = sqrt(1/TP + 1/FP + 1/FN + 1/TN).
  // Continuity correction (+0.5 to every cell) if any cell is 0.
  function calcDOR(tp, fp, fn, tn, opts) {
    const mode = normaliseContinuityMode(opts && opts.continuityCorrection);
    let a = tp;
    let b = fp;
    let c = fn;
    let d = tn;
    const hasZero = a === 0 || b === 0 || c === 0 || d === 0;
    if (mode === "always" || (mode === "auto" && hasZero)) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }
    // never + hasZero → DOR is 0 or ∞ depending on which cell is zero; the CI is undefined.
    const rawValue = mode === "never" ? (tp * tn) / (fp * fn) : (a * d) / (b * c);
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return { value: rawValue, ci: null };
    }
    const seLog = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    const logDor = Math.log(rawValue);
    const z = 1.96;
    return {
      value: rawValue,
      ci: {
        lower: Math.exp(logDor - z * seLog),
        upper: Math.exp(logDor + z * seLog),
      },
    };
  }

  function interpretDOR(value) {
    if (!Number.isFinite(value)) {
      return "DOR is infinite: the test perfectly separates cases from non-cases in this sample.";
    }
    if (value >= 100) {
      return "DOR ≥ 100: very strong discrimination between cases and non-cases.";
    }
    if (value >= 10) {
      return "DOR ≥ 10: clinically useful discrimination.";
    }
    if (value > 1) {
      return "DOR > 1 but limited: the test discriminates only modestly.";
    }
    if (value === 1) {
      return "DOR = 1: the test provides no information.";
    }
    return "DOR < 1: results may be labelled the wrong way — review TP/FP/FN/TN assignments.";
  }

  // Surface common biases that the 2x2 alone can signal.
  // Returns an array of plain-text warnings; empty array if nothing flagged.
  function buildBiasWarnings({ tp, fp, fn, tn, preTestProb }) {
    const warnings = [];
    const nDiseased = tp + fn;
    const nNonDiseased = tn + fp;
    const total = nDiseased + nNonDiseased;

    if (nDiseased > 0 && nDiseased < 30) {
      warnings.push(`Small diseased group (n=${nDiseased}). Sensitivity and likelihood-ratio estimates are imprecise — interpret 95% CIs carefully.`);
    }
    if (nNonDiseased > 0 && nNonDiseased < 30) {
      warnings.push(`Small non-diseased group (n=${nNonDiseased}). Specificity and likelihood-ratio estimates are imprecise — interpret 95% CIs carefully.`);
    }

    if (total > 0 && Number.isFinite(preTestProb)) {
      const studyPrev = nDiseased / total;
      const userPrev = preTestProb / 100;
      if (Math.abs(userPrev - studyPrev) > 0.20) {
        warnings.push(
          `Study prevalence (${(studyPrev * 100).toFixed(1)}%) differs substantially from your pre-test probability (${preTestProb.toFixed(1)}%). The PPV and NPV cards reflect the 2x2's prevalence; use the post-test probabilities for your patient.`
        );
      }
    }

    return warnings;
  }

  // Pauker DG, Kassirer JP. The threshold approach to clinical decision making.
  // N Engl J Med 1980;302(20):1109–1117.
  //
  // Given a clinician-stated treatment threshold Pt (the post-test probability
  // at which the expected utility of treating equals that of not treating) and
  // the diagnostic test's LR+ and LR−, return the two pre-test thresholds that
  // bracket the "testing is useful" zone:
  //
  //   testingThreshold       (P_low):  below this pre-test, even a positive
  //                                    result keeps post-test < Pt → don't test
  //   testTreatmentThreshold (P_high): above this pre-test, even a negative
  //                                    result keeps post-test ≥ Pt → just treat
  //
  // Derivation: solving post-odds = pre-odds × LR for the pre-test probability
  // that maps to Pt on the post-test scale gives
  //     P = Pt / (Pt + (1 − Pt) × LR)
  function calculateThresholds(opts) {
    if (!opts) return null;
    const Pt = opts.treatmentThreshold;
    if (!Number.isFinite(Pt) || Pt <= 0 || Pt >= 1) {
      return null;
    }

    function thresholdFromLR(lr) {
      if (Number.isNaN(lr)) return null;
      if (lr === Infinity) return 0;
      if (lr === 0) return 1;
      if (!Number.isFinite(lr) || lr < 0) return null;
      return Pt / (Pt + (1 - Pt) * lr);
    }

    return {
      treatmentThreshold: Pt,
      testingThreshold: thresholdFromLR(opts.lrPositive),
      testTreatmentThreshold: thresholdFromLR(opts.lrNegative),
    };
  }

  // Propagate the LR CI to the post-test probability scale via the Bayes' update
  // (delta method on the log-LR scale; monotonic transform preserves endpoints).
  function calcPostTestCI(preTestProbability, lrCi) {
    if (!lrCi) {
      return null;
    }
    if (!Number.isFinite(preTestProbability)) {
      return null;
    }

    const preOdds = calculateOdds(preTestProbability);
    const lower = probabilityFromOdds(multiplyOdds(preOdds, lrCi.lower));
    const upper = probabilityFromOdds(multiplyOdds(preOdds, lrCi.upper));

    if (Number.isNaN(lower) || Number.isNaN(upper)) {
      return null;
    }
    return { lower, upper };
  }

  function calculateRatio(numerator, denominator) {
    if (numerator === 0 && denominator === 0) {
      return NaN;
    }
    if (denominator === 0) {
      return Infinity;
    }
    if (numerator === 0) {
      return 0;
    }
    return numerator / denominator;
  }

  function calculateOdds(probability) {
    if (probability === 1) {
      return Infinity;
    }
    if (probability === 0) {
      return 0;
    }
    return probability / (1 - probability);
  }

  function multiplyOdds(odds, ratio) {
    if (odds === 0 || ratio === 0) {
      return 0;
    }
    if (!Number.isFinite(odds) || !Number.isFinite(ratio)) {
      return Infinity;
    }
    return odds * ratio;
  }

  function probabilityFromOdds(odds) {
    if (odds === Infinity) {
      return 1;
    }
    if (odds === 0) {
      return 0;
    }
    return odds / (1 + odds);
  }

  function formatValue(value, customFormatter) {
    if (typeof customFormatter === "function") {
      return customFormatter(value);
    }
    return formatPercentage(value);
  }

  function formatPercentage(value) {
    if (!Number.isFinite(value)) {
      return "—";
    }
    return `${(value * 100).toFixed(1)}%`;
  }

  function normaliseDecimal(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.replace(",", ".").trim();
  }

  function safeParseInt(value) {
    if (typeof value !== "string") {
      return NaN;
    }
    const trimmed = value.trim();
    if (trimmed === "") {
      return NaN;
    }
    if (!/^\d+$/.test(trimmed)) {
      return NaN;
    }
    return parseInt(trimmed, 10);
  }

  function formatLikelihood(value) {
    if (!Number.isFinite(value)) {
      return "∞";
    }
    if (value === 0) {
      return "0";
    }
    return value >= 10 ? value.toFixed(1) : value.toFixed(2);
  }

  function formatNNS(value) {
    if (!Number.isFinite(value)) return "—";
    if (value <= 0) return "—";
    return String(Math.ceil(value));
  }

  function interpretNNS(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return "NNS is undefined here (sensitivity or pre-test probability is zero).";
    }
    const rounded = Math.ceil(value);
    if (rounded < 10) {
      return `Roughly ${rounded} screened to detect one true case — efficient at this prevalence.`;
    }
    if (rounded < 100) {
      return `Roughly ${rounded} screened to detect one true case — moderate yield.`;
    }
    if (rounded < 1000) {
      return `Roughly ${rounded} screened to detect one true case — low yield, typical of low-prevalence screening.`;
    }
    return `Roughly ${rounded} screened to detect one true case — very low yield.`;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function buildSensitivityNote(value) {
    if (value >= 0.9) {
      return "Captures most cases with disease. Useful for screening.";
    }
    if (value >= 0.7) {
      return "Moderate sensitivity: consider alongside clinical context.";
    }
    return "Low sensitivity: consider additional tests to reduce false negatives.";
  }

  function buildSpecificityNote(value) {
    if (value >= 0.9) {
      return "Few false positives. Suitable for confirming diagnoses.";
    }
    if (value >= 0.7) {
      return "Moderate specificity: confirm with other laboratory or clinical data.";
    }
    return "Low specificity: beware of false positives and their impact on treatment decisions.";
  }

  function interpretLRPositive(value) {
    if (!Number.isFinite(value)) {
      return "LR+ is very high: a positive result virtually confirms the disease.";
    }
    if (value >= 10) {
      return "LR+ >= 10 indicates strong evidence in favour of disease.";
    }
    if (value >= 5) {
      return "Moderate LR+: substantially increases the probability of disease.";
    }
    if (value >= 2) {
      return "Low LR+: limited gain; combine with other data.";
    }
    return "LR+ close to 1: a positive result barely changes the probability of disease.";
  }

  function interpretLRNegative(value) {
    if (!Number.isFinite(value)) {
      return "LR- is infinite: a negative result does not reduce the probability of disease.";
    }
    if (value <= 0.1) {
      return "LR- <= 0.1 indicates strong evidence against disease.";
    }
    if (value <= 0.2) {
      return "Moderate LR-: reduces the probability of disease.";
    }
    if (value <= 0.5) {
      return "Low LR-: limited impact; consider further evaluation.";
    }
    return "LR- close to 1: a negative result does not rule out disease.";
  }

  function buildProbabilityBar(value, width) {
    const safeWidth = Number.isInteger(width) && width > 0 ? width : 20;
    const safeValue = Number.isFinite(value) ? clamp(value, 0, 1) : 0;
    const filled = Math.round(safeValue * safeWidth);
    return `${"#".repeat(filled)}${"-".repeat(safeWidth - filled)}`;
  }

  return {
    buildBiasWarnings,
    buildProbabilityBar,
    buildSensitivityNote,
    buildSpecificityNote,
    calcCohenKappa,
    calcDOR,
    calcLogRatioCI,
    calcPostTestCI,
    calcWilsonInterval,
    calculateMetrics,
    calculateOdds,
    calculateROC,
    calculateRatio,
    calculateThresholds,
    clamp,
    formatLikelihood,
    formatNNS,
    formatPercentage,
    formatValue,
    generateSyntheticRocPoints,
    interpretDOR,
    interpretKappa,
    interpretLRNegative,
    interpretLRPositive,
    interpretNNS,
    invStdNormal,
    multiplyOdds,
    normaliseDecimal,
    probabilityFromOdds,
    safeParseInt,
    stdNormalCdf,
    validateInputs,
  };
}));
