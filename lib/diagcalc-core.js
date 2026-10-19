(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./diagcalc-presentation"));
    return;
  }

  root.DiagcalcCore = factory(root.DiagcalcPresentation);
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), (presentation) => {
  /**
   * @typedef {import("./diagcalc-types").DiagnosticInput} DiagnosticInput
   * @typedef {import("./diagcalc-types").CalculationOptions} CalculationOptions
   */
  /** @param {unknown} input Confusion matrix counts and probability in percent. */
  function validateInputs(input) {
    if (!input || typeof input !== "object") {
      return { valid: false, message: "Enter a confusion matrix and pre-test probability." };
    }
    const { tp, fp, fn, tn, preTestProb } = /** @type {DiagnosticInput} */ (input);
    const inputs = [tp, fp, fn, tn];
    if (inputs.some((value) => Number.isNaN(value) || value < 0)) {
      return { valid: false, message: "Enter non-negative integers for all confusion matrix cells." };
    }

    if (inputs.some((value) => !Number.isSafeInteger(value))) {
      return { valid: false, message: "Use whole numbers for TP, FP, FN, and TN." };
    }

    if (!Number.isSafeInteger(tp + fp + fn + tn)) {
      return { valid: false, message: "The total must be a safe whole number (at most 9007199254740991)." };
    }

    if (!Number.isFinite(preTestProb)) {
      return { valid: false, message: "Enter a valid pre-test probability." };
    }

    if (preTestProb < 0 || preTestProb > 100) {
      return { valid: false, message: "Pre-test probability must be between 0% and 100%, inclusive." };
    }

    if (tp + fn === 0) {
      return { valid: false, message: "Sensitivity is indeterminate: add cases with disease (TP or FN)." };
    }

    if (tn + fp === 0) {
      return { valid: false, message: "Specificity is indeterminate: add cases without disease (TN or FP)." };
    }

    return { valid: true };
  }

  /** @param {DiagnosticInput} input @param {CalculationOptions} [opts] */
  function calculateResults(input, opts) {
    if (!validateInputs(input).valid) return null;
    if (opts && opts.continuityCorrection && !["auto", "always", "never"].includes(opts.continuityCorrection)) return null;
    const { tp, fp, fn, tn, preTestProb } = input;
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
    const lrPositive = calculateRatio(sensitivity, fp / totals.nonDiseased);
    const lrNegative = calculateRatio(fn / totals.diseased, specificity);
    const preTestOdds = calculateOdds(preTest);
    const postTestOddsPositive = multiplyOdds(preTestOdds, lrPositive);
    const postTestOddsNegative = multiplyOdds(preTestOdds, lrNegative);
    const postTestProbPositive = probabilityFromOdds(postTestOddsPositive);
    const postTestProbNegative = probabilityFromOdds(postTestOddsNegative);

    const lrPositiveCI = Number.isNaN(lrPositive) ? null : calcLogRatioCI(tp, totals.diseased, fp, totals.nonDiseased, { continuityCorrection: continuityMode });
    const lrNegativeCI = Number.isNaN(lrNegative) ? null : calcLogRatioCI(fn, totals.diseased, tn, totals.nonDiseased, { continuityCorrection: continuityMode });
    const postTestPositiveCI = Number.isNaN(postTestProbPositive) ? null : calcPostTestCI(preTest, lrPositiveCI);
    const postTestNegativeCI = Number.isNaN(postTestProbNegative) ? null : calcPostTestCI(preTest, lrNegativeCI);
    const dor = calcDOR(tp, fp, fn, tn, { continuityCorrection: continuityMode });
    const nns = (sensitivity > 0 && preTest > 0) ? 1 / (sensitivity * preTest) : Infinity;

    const results = {
      sensitivity: {
        value: sensitivity,
        ci: calcWilsonInterval(tp, totals.diseased),
      },
      specificity: {
        value: specificity,
        ci: calcWilsonInterval(tn, totals.nonDiseased),
      },
      ppv: {
        value: ppv,
        ci: calcWilsonInterval(tp, totals.positives),
      },
      npv: {
        value: npv,
        ci: calcWilsonInterval(tn, totals.negatives),
      },
      dor: {
        value: dor.value,
        ci: dor.ci,
      },
      numberNeededToScreen: {
        value: nns,
      },
      lrPositive: {
        value: lrPositive,
        ci: lrPositiveCI,
      },
      lrNegative: {
        value: lrNegative,
        ci: lrNegativeCI,
      },
      preTestProbability: {
        value: preTest,
      },
      postTestPositive: {
        value: postTestProbPositive,
        ci: postTestPositiveCI,
      },
      postTestNegative: {
        value: postTestProbNegative,
        ci: postTestNegativeCI,
      },
    };
    return Object.fromEntries(Object.entries(results).map(([key, metric]) => [key, {
      ...metric,
      unit: ["dor", "lrPositive", "lrNegative"].includes(key) ? "ratio" : key === "numberNeededToScreen" ? "count" : "probability",
      interpretation: { id: key, params: { value: metric.value } },
    }]));
  }

  // Compatibility adapter: new integrations may consume calculateResults()
  // directly; all prose and formatter selection live in presentation.
  /** @param {DiagnosticInput} input @param {CalculationOptions} [opts] */
  function calculateMetrics(input, opts = {}) {
    const results = calculateResults(input, opts);
    return results && presentation.presentResults(results, { formatLikelihood, formatNNS }, opts && opts.locale);
  }

  /** @param {number} successes @param {number} total */
  function calcWilsonInterval(successes, total) {
    if (!Number.isSafeInteger(total) || !Number.isSafeInteger(successes) || successes < 0 || successes > total || total <= 0) {
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
    if (![x1, n1, x2, n2].every(Number.isSafeInteger) || x1 < 0 || x2 < 0 || n1 <= 0 || n2 <= 0 || x1 > n1 || x2 > n2) return null;
    const mode = normaliseContinuityMode(opts && opts.continuityCorrection);
    let a = x1;
    let b = n1 - x1;
    let c = x2;
    let d = n2 - x2;
    const hasZero = a === 0 || b === 0 || c === 0 || d === 0;
    const corrected = mode === "always" || (mode === "auto" && hasZero);

    if (corrected) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }
    // "never" mode leaves cells as-is — the existing checks below catch the
    // cases where the maths actually fails (p1 or p2 = 0). The correction
    // applies to this interval only; point estimates stay uncorrected.

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
      corrected,
    };
  }

  function normaliseContinuityMode(value) {
    if (value === "always" || value === "never") return value;
    return "auto";
  }

  // Cohen's kappa for inter-rater agreement on a binary outcome.
  // Inputs: the four cells of the rater1×rater2 2×2 table.
  // Returns { value, ci, observed, expected, n, interpretation } or null on
  // empty input. Marginal-adjusted asymptotic variance for the CI; Landis & Koch (1977) bins
  // for the qualitative interpretation.
  function calcCohenKappa(input) {
    if (!input || typeof input !== "object") return null;
    const { bothPos, only1Pos, only2Pos, bothNeg } = input;
    const cells = [bothPos, only1Pos, only2Pos, bothNeg];
    if (cells.some((v) => !Number.isSafeInteger(v) || v < 0)) return null;
    const N = bothPos + only1Pos + only2Pos + bothNeg;
    if (N === 0 || !Number.isSafeInteger(N)) return null;

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
    // Unweighted asymptotic variance including estimated marginal frequencies.
    // Reference implementation: statsmodels.stats.inter_rater.cohens_kappa.
    const rows = [r1Pos, r1Neg];
    const cols = [r2Pos, r2Neg];
    const diagonal = [bothPos / N, bothNeg / N];
    const termA = diagonal.reduce((sum, p, i) =>
      sum + p * (1 - (rows[i] + cols[i]) * (1 - kappa)) ** 2, 0);
    const termB = (1 - kappa) ** 2 * (
      (only1Pos / N) * (cols[0] + rows[1]) ** 2 +
      (only2Pos / N) * (cols[1] + rows[0]) ** 2
    );
    const termC = (kappa - pe * (1 - kappa)) ** 2;
    const variance = Math.max(0, (termA + termB - termC) / ((1 - pe) ** 2 * N));
    const seKappa = Math.sqrt(variance);
    const z = 1.96;
    return {
      value: kappa,
      ci: { lower: Math.max(-1, kappa - z * seKappa), upper: Math.min(1, kappa + z * seKappa) },
      observed: po,
      expected: pe,
      n: N,
      interpretation: interpretKappa(kappa),
    };
  }

  function interpretKappa(value) {
    return presentation.noteFor("interpretKappa", value);
  }

  // ROC reconstruction from a list of (cutoff, TP, FP, FN, TN) rows, one per
  // threshold of a continuous test. Returns the sorted points on the (FPR, TPR)
  // plane, trapezoidal AUC including the (0,0) and (1,1) anchors, and the index
  // of the row with the highest Youden's J = sens + spec − 1.
  /** @param {unknown} rows @param {{direction?: string}} [opts] */
  function validateRocRows(rows, opts) {
    opts = opts || {};
    const errors = [];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > 500) {
      return { valid: false, errors: [{ row: null, message: "Use between one and 500 complete cutoff rows." }] };
    }
    let totals = null;
    rows.forEach((row, index) => {
      const validation = validateInputs(row && { ...row, preTestProb: 50 });
      if (!validation.valid) {
        errors.push({ row: index + 1, message: validation.message });
        return;
      }
      const current = [row.tp + row.fn, row.fp + row.tn];
      if (totals && (totals[0] !== current[0] || totals[1] !== current[1])) {
        errors.push({ row: index + 1, message: "All cutoffs must use the same diseased and non-diseased cohorts." });
      }
      totals = totals || current;
      if (row.cutoff !== null && row.cutoff !== undefined && !Number.isFinite(row.cutoff)) {
        errors.push({ row: index + 1, message: "Cutoff must be a finite number or left blank." });
      }
    });
    if (errors.length) return { valid: false, errors };
    const sorted = rows.map((row, index) => ({ ...row, index }))
      .sort((a, b) => a.fp - b.fp || a.tp - b.tp);
    for (let i = 1; i < sorted.length; i += 1) {
      if (sorted[i].tp < sorted[i - 1].tp) {
        errors.push({ row: sorted[i].index + 1, message: "Sensitivity must not decrease as the false-positive rate increases." });
      }
    }
    const direction = opts.direction === "lower" ? "lower" : "higher";
    const cutoffs = sorted.filter((row) => Number.isFinite(row.cutoff));
    for (let i = 1; i < cutoffs.length; i += 1) {
      const previous = cutoffs[i - 1];
      const current = cutoffs[i];
      const changed = current.tp !== previous.tp || current.fp !== previous.fp;
      const ordered = direction === "higher" ? current.cutoff < previous.cutoff : current.cutoff > previous.cutoff;
      if (changed && !ordered) {
        errors.push({ row: current.index + 1, message: `Cutoffs must follow the selected ${direction}-score-positive direction.` });
      }
    }
    return { valid: errors.length === 0, errors };
  }

  function calculateROC(rows, opts) {
    if (!validateRocRows(rows, opts).valid) return null;
    const points = rows.map((row) => {
      const sens = row.tp / (row.tp + row.fn);
      const spec = row.tn / (row.tn + row.fp);
      return {
        ...row,
        cutoff: row.cutoff ?? null,
        provenance: row.provenance || (row.synthetic ? "simulated" : "observed"),
        sens,
        spec,
        fpr: row.fp / (row.tn + row.fp),
        youden: sens + spec - 1,
      };
    }).sort((a, b) => a.fpr - b.fpr || a.sens - b.sens);

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
      simulated: points.some((point) => point.provenance !== "observed"),
      auc,
      optimalIndex,
      optimalPoint: optimalIndex >= 0 ? points[optimalIndex] : null,
    };
  }

  // Standard normal CDF Φ(x). Abramowitz & Stegun 7.1.26 polynomial approximation
  // of erf; max error ~1.5e-7 — fine for ROC scaffolding.
  /** @param {number} x */
  function stdNormalCdf(x) {
    if (Number.isNaN(x)) return NaN;
    if (!Number.isFinite(x)) return x > 0 ? 1 : 0;
    const sign = x < 0 ? -1 : 1;
    const ax = Math.abs(x) / Math.SQRT2;
    const t = 1 / (1 + 0.3275911 * ax);
    const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax);
    return 0.5 * (1 + sign * y);
  }

  // Inverse standard normal Φ⁻¹(p) via Acklam's rational approximation.
  // Max relative error ~1.15e-9 in (0, 1).
  /** @param {number} p */
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
    if (!validateInputs(observed && { ...observed, preTestProb: 50 }).valid) return [];
    const { tp, fp, fn, tn } = observed;
    if (!Number.isInteger(tp) || !Number.isInteger(fp) || !Number.isInteger(fn) || !Number.isInteger(tn)) return [];
    const P = tp + fn;
    const N = tn + fp;
    if (P <= 0 || N <= 0) return [];
    const sens = tp / P;
    const spec = tn / N;
    // Edge: a perfect (or pathological) observed point has Φ⁻¹(0) = -∞.
    // Nudge sens/spec away from 0 and 1 so d stays finite. Cap the nudge for
    // tiny cohorts: an uncapped 1/(2·max(P,N)) turns a perfect 1/1 table into
    // the chance diagonal instead of reflecting the observed separation.
    const eps = Math.min(0.05, 1 / (2 * Math.max(P, N)));
    const sClamp = Math.min(1 - eps, Math.max(eps, sens));
    const pClamp = Math.min(1 - eps, Math.max(eps, spec));
    const d = invStdNormal(sClamp) + invStdNormal(pClamp);
    const n = Number.isInteger(count) ? Math.max(1, Math.min(20, count)) : 7;
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
        provenance: "simulated",
      });
    }
    return rows;
  }

  // Diagnostic odds ratio with log-normal CI.
  // DOR = (TP·TN) / (FP·FN); SE(log DOR) = sqrt(1/TP + 1/FP + 1/FN + 1/TN).
  // Continuity correction (+0.5 to every cell) affects the interval only; the
  // displayed point estimate always uses the observed cells. This mirrors the
  // LR behaviour and keeps the "correction for CIs" option honest.
  function calcDOR(tp, fp, fn, tn, opts) {
    if (![tp, fp, fn, tn].every((value) => Number.isSafeInteger(value) && value >= 0) || !Number.isSafeInteger(tp + fp + fn + tn) || tp + fp + fn + tn === 0) return { value: NaN, ci: null };
    const mode = normaliseContinuityMode(opts && opts.continuityCorrection);
    let a = tp;
    let b = fp;
    let c = fn;
    let d = tn;
    const hasZero = a === 0 || b === 0 || c === 0 || d === 0;
    const corrected = mode === "always" || (mode === "auto" && hasZero);
    if (corrected) {
      a += 0.5;
      b += 0.5;
      c += 0.5;
      d += 0.5;
    }
    const rawValue = calculateRatio(tp * tn, fp * fn);
    if (!corrected && (!Number.isFinite(rawValue) || rawValue <= 0)) {
      return { value: rawValue, ci: null };
    }
    // The corrected interval is centred on the adjusted ratio, so it can
    // exclude an infinite or zero observed DOR; callers label it as corrected.
    const intervalRatio = corrected ? (a * d) / (b * c) : rawValue;
    const seLog = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    const logDor = Math.log(intervalRatio);
    const z = 1.96;
    return {
      value: rawValue,
      ci: {
        lower: Math.exp(logDor - z * seLog),
        upper: Math.exp(logDor + z * seLog),
        corrected,
      },
    };
  }

  function interpretDOR(value) {
    return presentation.noteFor("interpretDOR", value);
  }

  // Surface common biases that the 2x2 alone can signal.
  // Returns an array of plain-text warnings; empty array if nothing flagged.
  /** @param {DiagnosticInput} input */
  function buildBiasWarnings(input) {
    if (!input || typeof input !== "object") return [];
    const { tp, fp, fn, tn, preTestProb } = input;
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
  /** @param {{treatmentThreshold: number, lrPositive: number, lrNegative: number}} opts */
  function calculateThresholds(opts) {
    if (!opts) return null;
    const Pt = opts.treatmentThreshold;
    if (!Number.isFinite(Pt) || Pt <= 0 || Pt >= 1) {
      return null;
    }

    if (!(opts.lrPositive > 1) || !(opts.lrNegative >= 0 && opts.lrNegative < 1)) return null;

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
  // Monotonic Bayes transformation preserves endpoints; the prior is fixed.
  function calcPostTestCI(preTestProbability, lrCi) {
    if (!lrCi) {
      return null;
    }
    if (!Number.isFinite(preTestProbability) || preTestProbability < 0 || preTestProbability > 1) {
      return null;
    }

    const preOdds = calculateOdds(preTestProbability);
    const lower = probabilityFromOdds(multiplyOdds(preOdds, lrCi.lower));
    const upper = probabilityFromOdds(multiplyOdds(preOdds, lrCi.upper));

    if (Number.isNaN(lower) || Number.isNaN(upper)) {
      return null;
    }
    return { lower, upper, corrected: Boolean(lrCi.corrected) };
  }

  /** @param {number} numerator @param {number} denominator */
  function calculateRatio(numerator, denominator) {
    if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || numerator < 0 || denominator < 0) return NaN;
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

  /** @param {number} probability */
  function calculateOdds(probability) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) return NaN;
    if (probability === 1) {
      return Infinity;
    }
    if (probability === 0) {
      return 0;
    }
    return probability / (1 - probability);
  }

  /** @param {number} odds @param {number} ratio */
  function multiplyOdds(odds, ratio) {
    if (typeof odds !== "number" || typeof ratio !== "number" || Number.isNaN(odds) || Number.isNaN(ratio) || odds < 0 || ratio < 0) return NaN;
    if ((odds === 0 && ratio === Infinity) || (ratio === 0 && odds === Infinity)) return NaN;
    return odds * ratio;
  }

  /** @param {number} probability */
  function chainedPreTestProbability(probability) {
    return Number.isFinite(probability) && probability >= 0 && probability <= 1 ? probability * 100 : NaN;
  }

  /** @param {number} odds */
  function probabilityFromOdds(odds) {
    if (typeof odds !== "number" || Number.isNaN(odds) || odds < 0) return NaN;
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

  /** @param {number} value */
  function formatPercentage(value) {
    if (!Number.isFinite(value)) {
      return "—";
    }
    return `${(value * 100).toFixed(1)}%`;
  }

  /** @param {unknown} value */
  function normaliseDecimal(value) {
    if (typeof value !== "string") {
      return "";
    }
    return value.replace(",", ".").trim();
  }

  /** @param {unknown} value */
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
    const parsed = Number(trimmed);
    return Number.isSafeInteger(parsed) ? parsed : NaN;
  }

  /** @param {unknown} value */
  function parseProbability(value) {
    const normalised = normaliseDecimal(value);
    if (!/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalised)) return NaN;
    const parsed = Number(normalised);
    return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? parsed : NaN;
  }

  /** @param {number} value */
  function formatLikelihood(value) {
    if (value === Infinity) {
      return "∞";
    }
    if (!Number.isFinite(value)) return "—";
    if (value === 0) {
      return "0";
    }
    return value >= 10 ? value.toFixed(1) : value.toFixed(2);
  }

  /** @param {number} value */
  function formatNNS(value) {
    if (!Number.isFinite(value)) return "—";
    if (value <= 0) return "—";
    return String(Math.ceil(value));
  }

  function interpretNNS(value) {
    return presentation.noteFor("interpretNNS", value);
  }

  /** @param {number} value @param {number} min @param {number} max */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function buildSensitivityNote(value) {
    return presentation.noteFor("buildSensitivityNote", value);
  }

  function buildSpecificityNote(value) {
    return presentation.noteFor("buildSpecificityNote", value);
  }

  function interpretLRPositive(value) {
    return presentation.noteFor("interpretLRPositive", value);
  }

  function interpretLRNegative(value) {
    return presentation.noteFor("interpretLRNegative", value);
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
    calculateResults,
    chainedPreTestProbability,
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
    validateRocRows,
    parseProbability,
  };
}));
