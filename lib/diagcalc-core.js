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

  function calculateMetrics({ tp, fp, fn, tn, preTestProb }) {
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

    const lrPositiveCI = calcLogRatioCI(tp, totals.diseased, fp, totals.nonDiseased);
    const lrNegativeCI = calcLogRatioCI(fn, totals.diseased, tn, totals.nonDiseased);
    const postTestPositiveCI = calcPostTestCI(preTest, lrPositiveCI);
    const postTestNegativeCI = calcPostTestCI(preTest, lrNegativeCI);
    const dor = calcDOR(tp, fp, fn, tn);

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
  function calcLogRatioCI(x1, n1, x2, n2) {
    let a = x1;
    let b = n1 - x1;
    let c = x2;
    let d = n2 - x2;

    if (a === 0 || b === 0 || c === 0 || d === 0) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }

    const tn1 = a + b;
    const tn2 = c + d;
    const p1 = a / tn1;
    const p2 = c / tn2;

    if (p1 === 0 || p2 === 0) {
      return null;
    }

    const logRatio = Math.log(p1 / p2);
    const seLog = Math.sqrt((1 - p1) / a + (1 - p2) / c);

    if (!Number.isFinite(seLog)) {
      return null;
    }

    const z = 1.96;
    return {
      lower: Math.exp(logRatio - z * seLog),
      upper: Math.exp(logRatio + z * seLog),
    };
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

  // Diagnostic odds ratio with log-normal CI.
  // DOR = (TP·TN) / (FP·FN); SE(log DOR) = sqrt(1/TP + 1/FP + 1/FN + 1/TN).
  // Continuity correction (+0.5 to every cell) if any cell is 0.
  function calcDOR(tp, fp, fn, tn) {
    let a = tp;
    let b = fp;
    let c = fn;
    let d = tn;
    if (a === 0 || b === 0 || c === 0 || d === 0) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }
    const value = (a * d) / (b * c);
    if (!Number.isFinite(value) || value <= 0) {
      return { value, ci: null };
    }
    const seLog = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    const logDor = Math.log(value);
    const z = 1.96;
    return {
      value,
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
    formatPercentage,
    formatValue,
    interpretDOR,
    interpretLRNegative,
    interpretLRPositive,
    multiplyOdds,
    normaliseDecimal,
    probabilityFromOdds,
    safeParseInt,
    validateInputs,
  };
}));
