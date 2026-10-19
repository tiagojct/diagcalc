const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../lib/diagcalc-core");
const cases = require("../lib/diagcalc-case");
const meta = require("../lib/diagcalc-meta");
const geometry = require("../lib/diagcalc-geometry");
const datasets = require("../lib/diagcalc-datasets");
const { createStorage } = require("../lib/diagcalc-storage");
const { sanitiseRawInput, escapeTags } = require("../tui/input");
const { buildTextExport, buildMarkdownExport } = require("../tui/report");
const input = { tp: 80, fp: 20, fn: 20, tn: 80, preTestProb: 20 };
const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("validation rejects missing, nonnumeric, nonfinite, and unsafe inputs without throwing", () => {
  for (const value of [null, undefined, false, "20", "garbage", Infinity, -Infinity, NaN]) {
    assert.equal(core.validateInputs({ ...input, preTestProb: value }).valid, false);
    assert.equal(core.calculateMetrics({ ...input, preTestProb: value }), null);
  }
  for (const value of [null, undefined, "80", Infinity, 2 ** 53]) {
    assert.equal(core.validateInputs({ ...input, tp: value }).valid, false);
  }
  for (const value of [null, undefined, "invalid"]) assert.equal(core.validateInputs(value).valid, false);
  assert.equal(core.validateInputs({ ...input, tp: Number.MAX_SAFE_INTEGER }).valid, false);
  assert.ok(Number.isNaN(core.safeParseInt("9007199254740993")));
});

test("probability parsing consumes the complete string and respects inclusive bounds", () => {
  for (const value of ["20garbage", "1.2.3", "", "-5", "101", "Infinity", "1e2", undefined]) {
    assert.ok(Number.isNaN(core.parseProbability(value)), String(value));
  }
  for (const [value, expected] of [[" 20,5 ", 20.5], [".5", 0.5], ["0", 0], ["100", 100]]) {
    assert.equal(core.parseProbability(value), expected);
  }
});

test("terminal prompt input preserves invalid signs and decimals for validation", () => {
  for (const value of ["-5", "1.5", "20garbage", "1.2.3"]) assert.equal(sanitiseRawInput("tp", value), value);
});

test("blessed tag escaping renders user braces literally", () => {
  assert.equal(escapeTags("{red-fg}"), "{open}red-fg{close}");
  assert.equal(escapeTags("path/{bold}.txt"), "path/{open}bold{close}.txt");
  assert.equal(escapeTags("-5"), "-5");
});

test("undefined Bayesian arithmetic never becomes certainty", () => {
  for (const [odds, lr] of [[NaN, 2], [2, NaN], [0, Infinity], [Infinity, 0], [-1, 2]]) {
    assert.ok(Number.isNaN(core.multiplyOdds(odds, lr)));
  }
  assert.equal(core.multiplyOdds(0, 2), 0);
  assert.equal(core.multiplyOdds(Infinity, 2), Infinity);
  assert.equal(core.formatLikelihood(NaN), "—");
  assert.equal(core.formatLikelihood(Infinity), "∞");
});

test("chaining preserves exact boundaries, precision, and impossible evidence", () => {
  const perfect = core.calculateMetrics({ tp: 50, fp: 0, fn: 0, tn: 50, preTestProb: 20 });
  assert.equal(core.chainedPreTestProbability(perfect.postTestPositive.value), 100);
  const second = core.calculateMetrics({ ...input, preTestProb: 100 });
  assert.equal(second.postTestPositive.value, 1);
  assert.equal(second.postTestNegative.value, 1);
  assert.ok(Number.isNaN(core.calculateMetrics({ tp: 50, fp: 0, fn: 0, tn: 50, preTestProb: 100 }).postTestNegative.value));
  assert.equal(core.chainedPreTestProbability(0.123456789012345), 12.3456789012345);
});

test("all-positive tables retain defined metrics and mark impossible results undefined", () => {
  const results = core.calculateResults({ tp: 50, fp: 50, fn: 0, tn: 0, preTestProb: 50 });
  assert.equal(results.sensitivity.value, 1);
  assert.equal(results.specificity.value, 0);
  assert.ok(Number.isNaN(results.npv.value));
  assert.ok(Number.isNaN(results.postTestNegative.value));
});

test("exhaustive small matrices preserve posterior bounds and Bayes identities", () => {
  for (let tp = 0; tp <= 3; tp += 1) for (let fp = 0; fp <= 3; fp += 1) {
    for (let fn = 0; fn <= 3; fn += 1) for (let tn = 0; tn <= 3; tn += 1) {
      if (!tp && !fn || !fp && !tn) continue;
      for (const preTestProb of [0, 20, 50, 100]) {
        const results = core.calculateResults({ tp, fp, fn, tn, preTestProb });
        const p = preTestProb / 100;
        const sensitivity = tp / (tp + fn);
        const falsePositive = fp / (fp + tn);
        for (const [key, diseasedRate, healthyRate] of [
          ["postTestPositive", sensitivity, falsePositive],
          ["postTestNegative", 1 - sensitivity, 1 - falsePositive],
        ]) {
          const denominator = p * diseasedRate + (1 - p) * healthyRate;
          const actual = results[key].value;
          if (!denominator) assert.ok(Number.isNaN(actual));
          else {
            assert.ok(actual >= 0 && actual <= 1);
            close(actual, p * diseasedRate / denominator);
          }
        }
      }
    }
  }
});

test("noninformative and inverted tests have no standard decision threshold display", () => {
  for (const [lrPositive, lrNegative] of [[1, 1], [0.25, 4], [NaN, 0.1], [5, 2]]) {
    assert.equal(core.calculateThresholds({ treatmentThreshold: 0.3, lrPositive, lrNegative }), null);
  }
});

test("kappa CI matches marginal-adjusted reference fixture", () => {
  // statsmodels unweighted asymptotic variance, fixture table [[90,5],[3,2]].
  // https://www.statsmodels.org/stable/_modules/statsmodels/stats/inter_rater.html
  const result = core.calcCohenKappa({ bothPos: 90, only1Pos: 5, only2Pos: 3, bothNeg: 2 });
  close(result.value, 0.2920353982300895);
  close(result.ci.lower, -0.06427496452072584);
  close(result.ci.upper, 0.6483457609809049);
  assert.equal(core.calcCohenKappa(null), null);
  assert.equal(core.calcCohenKappa({ bothPos: Number.MAX_SAFE_INTEGER, only1Pos: 1, only2Pos: 1, bothNeg: 1 }), null);
});

const rocRows = [
  { cutoff: 3, tp: 20, fp: 20, fn: 80, tn: 80 },
  { cutoff: 2, tp: 80, fp: 20, fn: 20, tn: 80 },
  { cutoff: 1, tp: 90, fp: 80, fn: 10, tn: 20 },
];
test("tied-FPR ROC segments integrate correctly regardless of input order", () => {
  close(core.calculateROC(rocRows).auc, 0.72);
  close(core.calculateROC([...rocRows].reverse()).auc, 0.72);
});

test("ROC reports row errors for invalid cohorts, cutoffs, and nonmonotonic paths", () => {
  for (const rows of [[null], [rocRows[0], { ...rocRows[1], tn: 81 }],
    [rocRows[0], { ...rocRows[1], cutoff: 4 }],
    [{ ...rocRows[0], tp: 80, fn: 20 }, { ...rocRows[1], tp: 20, fn: 80, fp: 30, tn: 70 }]]) {
    const validation = core.validateRocRows(rows);
    assert.equal(validation.valid, false);
    assert.ok(validation.errors[0].row >= 1);
    assert.equal(core.calculateROC(rows), null);
  }
  assert.equal(core.calculateROC(rocRows.map((row) => ({ ...row, cutoff: -row.cutoff })), { direction: "lower" }).points.length, 3);
});

test("simulated and edited simulated origins remain in ROC outputs", () => {
  const result = core.calculateROC(rocRows.map((row, index) => ({ ...row, provenance: index ? "edited-simulated" : "observed" })));
  assert.equal(result.simulated, true);
  assert.equal(result.points[1].provenance, "edited-simulated");
});

test("Fagan LR coordinates stay fixed and lie on the Bayes straight line", () => {
  for (const pre of [0.01, 0.1, 0.5, 0.9]) for (const lr of [0.1, 1, 10]) {
    const post = core.probabilityFromOdds(core.multiplyOdds(core.calculateOdds(pre), lr));
    const positions = geometry.faganCoordinates(pre, lr, post);
    assert.equal(positions.inRange, true);
    close((positions.pre + positions.post) / 2, positions.lr);
    close(positions.lr, geometry.lrPosition(lr));
  }
  assert.equal(geometry.faganCoordinates(0, Infinity, NaN).inRange, false);
});

test("storage recovers from getter, read, write, and remove failures", () => {
  for (const backend of [() => { throw new Error("SecurityError"); }, () => ({
    getItem() { throw new Error("read"); }, setItem() { throw new Error("quota"); }, removeItem() { throw new Error("remove"); },
  })]) {
    const storage = createStorage(backend);
    assert.equal(storage.getItem("key"), null);
    storage.setItem("key", "value");
    assert.equal(storage.getItem("key"), "value");
    storage.removeItem("key");
    assert.equal(storage.getItem("key"), null);
  }
});

test("snapshots retain settings and distinguish exceptional numbers in JSON", () => {
  const snapshot = cases.createSnapshot({ tp: 50, fp: 0, fn: 0, tn: 50, preTestProb: 100 }, { continuityCorrection: "never" });
  const parsed = JSON.parse(JSON.stringify(snapshot));
  assert.equal(parsed.schemaVersion, 2);
  assert.equal(parsed.engineVersion, meta.version);
  assert.equal(parsed.options.continuityCorrection, "never");
  assert.equal(parsed.metrics.lrPositive.status, "infinite");
  assert.equal(parsed.metrics.postTestNegative.status, "undefined");
  assert.equal(parsed.metrics.lrPositive.ci, null);
  assert.equal(cases.summary(parsed).lrPositive, Infinity);
  assert.ok(Number.isNaN(cases.summary(parsed).postTestNegative));
  assert.notEqual(cases.fingerprint(cases.createSnapshot(input, { continuityCorrection: "auto" })),
    cases.fingerprint(cases.createSnapshot(input, { continuityCorrection: "always" })));

  const corrected = JSON.parse(JSON.stringify(cases.createSnapshot(
    { tp: 50, fp: 0, fn: 5, tn: 100, preTestProb: 30 },
    { continuityCorrection: "auto" },
  )));
  assert.equal(corrected.metrics.lrPositive.ci.corrected, true);
  assert.equal(corrected.metrics.postTestPositive.ci.corrected, true);
});

test("history discards malformed records individually and bounds its size", () => {
  const entries = Array.from({ length: 15 }, (_, index) => cases.createSnapshot(input, {}, { id: String(index) }));
  const loaded = cases.parseHistory(JSON.stringify([null, {}, { ...entries[0], metrics: {} }, ...entries]));
  assert.equal(loaded.length, 10);
  assert.equal(cases.parseHistory("not JSON").length, 0);
  assert.equal(cases.parseHistory(JSON.stringify([{ ...entries[0], schemaVersion: 99 }])).length, 0);
  assert.equal(cases.parseHistory(JSON.stringify([entries[0], entries[0]])).length, 1);
});

test("history honours explicit limits and keeps id-less legacy entries distinct", () => {
  const entries = Array.from({ length: 3 }, (_, index) => cases.createSnapshot(input, {}, { id: `e${index}` }));
  const raw = JSON.stringify(entries);
  assert.equal(cases.parseHistory(raw, 0).length, 0);
  assert.equal(cases.parseHistory(raw, -5).length, 0);
  assert.equal(cases.parseHistory(raw, 1).length, 1);
  assert.equal(cases.parseHistory(raw, 10.5).length, 3);
  const legacy = (label, tp) => ({ label, savedAt: "2025-01-01T00:00:00Z", input: { ...input, tp } });
  assert.equal(cases.parseHistory(JSON.stringify([legacy("A", 80), legacy("B", 81)])).length, 2);
});

test("history rejects same-version metrics that disagree with the stored input", () => {
  const original = cases.createSnapshot(input, {}, { id: "tampered" });
  const tampered = JSON.parse(JSON.stringify(original));
  tampered.metrics.sensitivity.value = 1;
  assert.equal(cases.parseHistory(JSON.stringify([tampered])).length, 0);

  const inverted = JSON.parse(JSON.stringify(original));
  inverted.metrics.sensitivity.ci = {
    lower: { value: 0.9, status: "finite" },
    upper: { value: 0.1, status: "finite" },
    corrected: false,
  };
  assert.equal(cases.parseHistory(JSON.stringify([inverted])).length, 0);

  const historical = JSON.parse(JSON.stringify(original));
  historical.engineVersion = "5.0.0";
  historical.metrics.sensitivity.value = 1;
  assert.equal(cases.parseHistory(JSON.stringify([historical])).length, 1);
});

test("snapshot writer normalises fields its reader would otherwise reject", () => {
  const snapshot = cases.createSnapshot(input, {}, {
    id: "x".repeat(101),
    datasetKey: "d".repeat(101),
    savedAt: "not-a-date",
  });
  assert.notEqual(snapshot.id, "x".repeat(101));
  assert.ok(snapshot.id.length > 0 && snapshot.id.length <= 100);
  assert.equal(snapshot.datasetKey.length, 100);
  assert.ok(Number.isFinite(Date.parse(snapshot.savedAt)));
  assert.equal(cases.parseHistory(JSON.stringify([snapshot])).length, 1);
});

test("optional null arguments do not throw", () => {
  assert.deepEqual(core.buildBiasWarnings(null), []);
  assert.doesNotThrow(() => core.validateRocRows([{ cutoff: 1, tp: 10, fp: 1, fn: 0, tn: 9 }], null));
  assert.doesNotThrow(() => cases.createSnapshot(input, null));
  assert.doesNotThrow(() => cases.createSnapshot(input, {}, null));
  assert.doesNotThrow(() => cases.methodMetadata(null));
  assert.deepEqual(cases.summary(null), {});
});

test("synthetic ROC retains separation for tiny cohorts and honours count bounds", () => {
  const tiny = core.generateSyntheticRocPoints({ tp: 1, fp: 0, fn: 0, tn: 1 }, 7);
  const roc = core.calculateROC(tiny);
  assert.ok(roc);
  assert.ok(roc.auc > 0.95, `tiny perfect cohort should not collapse to chance, got AUC ${roc.auc}`);
  assert.equal(core.generateSyntheticRocPoints(input, 1).length, 1);
  assert.equal(core.generateSyntheticRocPoints(input, 21).length, 20);
  assert.equal(core.generateSyntheticRocPoints(input, 7.5).length, 7);
});

test("kappa confidence intervals stay inside [-1, 1]", () => {
  const result = core.calcCohenKappa({ bothPos: 20, only1Pos: 0, only2Pos: 1, bothNeg: 5 });
  assert.ok(result.ci.lower >= -1 && result.ci.lower <= result.value);
  assert.ok(result.ci.upper <= 1 && result.ci.upper >= result.value);
});

test("legacy history is explicitly recomputed with unknown original settings", () => {
  const legacy = { id: 123, label: "Old case", savedAt: "2025-01-01T00:00:00Z", input, summary: { sensitivity: 1000 } };
  const migrated = cases.parseHistory(JSON.stringify([legacy]))[0];
  assert.equal(migrated.legacy, true);
  assert.equal(migrated.options.continuityCorrection, "auto");
  assert.equal(cases.summary(migrated).sensitivity, 0.8);
});

test("numeric results have no presentation functions or prose, and localisation preserves values", () => {
  const raw = core.calculateResults(input);
  const english = core.calculateMetrics(input);
  const portuguese = core.calculateMetrics(input, { locale: "pt-PT" });
  for (const [key, metric] of Object.entries(raw)) {
    assert.equal(metric.label, undefined);
    assert.equal(metric.formatter, undefined);
    assert.ok(metric.interpretation.id);
    assert.equal(english[key].value, portuguese[key].value);
    assert.notEqual(english[key].label, portuguese[key].label);
  }
});

test("every preset declares auditable origin and avoids unsupported verified-count claims", () => {
  for (const dataset of datasets.listDatasets()) {
    assert.equal(dataset.provenance.kind, "illustrative");
    assert.equal(dataset.provenance.sourceLocation, null);
    assert.match(datasets.buildDatasetWarnings(dataset)[0], /illustrative|Illustrative/);
    assert.ok(Object.isFrozen(datasets.getDataset(dataset.key)));
  }
});

test("terminal reports include engine, correction mode, provenance and bias warnings", () => {
  const dataset = datasets.getDataset("ddimer");
  const state = { input: dataset, activeDatasetKey: "ddimer", activeCaseLabel: dataset.name };
  for (const render of [buildTextExport, buildMarkdownExport]) {
    const text = render(state, core.calculateMetrics(dataset), core.validateInputs(dataset));
    assert.ok(text.includes(`Engine ${require("../package.json").version}; continuity correction: auto`));
    assert.match(text, /Illustrative teaching counts/);
  }
});

test("terminal exports retain the raw offending value for invalid cases", () => {
  const state = {
    input: { tp: NaN, fp: NaN, fn: NaN, tn: NaN, preTestProb: NaN },
    rawInput: { tp: "-5", fp: "", fn: "", tn: "", preTestProb: "abc" },
    activeCaseLabel: "Invalid case",
    activeDatasetKey: "ad_hoc",
    originDatasetKey: null,
  };
  const validation = core.validateInputs(state.input);
  assert.equal(validation.valid, false);
  for (const render of [buildTextExport, buildMarkdownExport]) {
    const text = render(state, null, validation);
    assert.match(text, /-5/);
    assert.match(text, /abc/);
    assert.match(text, /Validation/);
  }
});


test("undefined conditioning events do not display finite confidence intervals", () => {
  const absent = core.calculateResults({ tp: 0, fp: 0, fn: 10, tn: 10, preTestProb: 20 });
  assert.ok(Number.isNaN(absent.lrPositive.value));
  assert.equal(absent.lrPositive.ci, null);
  assert.equal(absent.postTestPositive.ci, null);
  const impossible = core.calculateResults({ tp: 10, fp: 0, fn: 0, tn: 10, preTestProb: 0 });
  assert.ok(Number.isNaN(impossible.postTestPositive.value));
  assert.equal(impossible.postTestPositive.ci, null);
});


test("history retains bounded source provenance when saving another calculation", () => {
  const snapshot = cases.createSnapshot({ tp: 10, fp: 1, fn: 1, tn: 10, preTestProb: 20 }, {}, {
    provenance: { kind: "illustrative", note: "Background reference only", untrusted: "ignored" },
  });
  const restored = cases.parseHistory(JSON.stringify([snapshot]))[0];
  assert.equal(restored.provenance.kind, "illustrative");
  assert.equal(restored.provenance.note, "Background reference only");
  assert.equal(restored.provenance.untrusted, undefined);
});
