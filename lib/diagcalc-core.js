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
      return { valid: false, message: "Pre-test probability must be between 0 and 99.9%." };
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
      lrPositive: {
        label: "Positive likelihood ratio (LR+)",
        value: lrPositive,
        formatter: formatLikelihood,
        note: interpretLRPositive(lrPositive),
      },
      lrNegative: {
        label: "Negative likelihood ratio (LR-)",
        value: lrNegative,
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
        note: "Updated probability of disease after a positive test.",
      },
      postTestNegative: {
        label: "Post-test probability (negative result)",
        value: postTestProbNegative,
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

  function calculateRatio(numerator, denominator) {
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
    buildProbabilityBar,
    buildSensitivityNote,
    buildSpecificityNote,
    calcWilsonInterval,
    calculateMetrics,
    calculateOdds,
    calculateRatio,
    clamp,
    formatLikelihood,
    formatPercentage,
    formatValue,
    interpretLRNegative,
    interpretLRPositive,
    multiplyOdds,
    normaliseDecimal,
    probabilityFromOdds,
    safeParseInt,
    validateInputs,
  };
}));
