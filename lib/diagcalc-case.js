(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory(require("./diagcalc-core"), require("./diagcalc-meta"));
    return;
  }
  root.DiagcalcCase = factory(root.DiagcalcCore, root.DiagcalcMeta);
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), /** @param {typeof import("./diagcalc-core")} core @param {typeof import("./diagcalc-meta")} meta */ (core, meta) => {
  const metricKeys = ["sensitivity", "specificity", "ppv", "npv", "dor", "numberNeededToScreen", "lrPositive", "lrNegative", "preTestProbability", "postTestPositive", "postTestNegative"];
  const modes = ["auto", "always", "never"];

  /** @param {number} value @returns {import("./diagcalc-types").EncodedNumber} */
  function encodeNumber(value) {
    if (value === Infinity) return { value: null, status: "infinite" };
    if (value === -Infinity) return { value: null, status: "negative-infinite" };
    if (!Number.isFinite(value)) return { value: null, status: "undefined" };
    return { value, status: "finite" };
  }

  /** @param {import("./diagcalc-types").EncodedNumber} encoded */
  function decodeNumber(encoded) {
    if (!encoded || typeof encoded !== "object") return NaN;
    if (encoded.status === "infinite" && encoded.value === null) return Infinity;
    if (encoded.status === "negative-infinite" && encoded.value === null) return -Infinity;
    if (encoded.status === "finite" && Number.isFinite(encoded.value)) return encoded.value;
    return NaN;
  }

  function validNumber(encoded) {
    return encoded && (encoded.status === "finite" ? Number.isFinite(encoded.value) :
      ["infinite", "negative-infinite", "undefined"].includes(encoded.status) && encoded.value === null);
  }

  /** @param {import("./diagcalc-types").NumericMetric} metric */
  function serialiseMetric(metric) {
    return {
      ...encodeNumber(metric.value),
      ci: metric.ci ? { lower: encodeNumber(metric.ci.lower), upper: encodeNumber(metric.ci.upper) } : null,
    };
  }

  /**
   * Create a versioned, JSON-safe calculation snapshot; invalid input returns null.
   * @param {import("./diagcalc-types").DiagnosticInput} input
   * @param {import("./diagcalc-types").CalculationOptions} [options]
   * @param {import("./diagcalc-types").CaseInfo} [caseInfo]
   * @returns {import("./diagcalc-types").Snapshot | null}
   */
  function createSnapshot(input, options = {}, caseInfo = {}) {
    if (!core.validateInputs(input).valid) return null;
    const continuityCorrection = options.continuityCorrection || "auto";
    if (!modes.includes(continuityCorrection)) return null;
    const { tp, fp, fn, tn, preTestProb } = input;
    const cleanInput = { tp, fp, fn, tn, preTestProb };
    const metrics = core.calculateResults(cleanInput, { continuityCorrection });
    return {
      schemaVersion: meta.schemaVersion,
      engineVersion: meta.version,
      id: typeof caseInfo.id === "string" ? caseInfo.id : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      savedAt: caseInfo.savedAt || new Date().toISOString(),
      label: typeof caseInfo.label === "string" ? caseInfo.label.slice(0, 200) : "Custom case",
      datasetKey: typeof caseInfo.datasetKey === "string" ? caseInfo.datasetKey : null,
      modified: Boolean(caseInfo.modified),
      legacy: Boolean(caseInfo.legacy),
      provenance: caseInfo.provenance || null,
      input: cleanInput,
      options: { continuityCorrection },
      metrics: Object.fromEntries(Object.entries(metrics).map(([key, metric]) => [key, serialiseMetric(metric)])),
    };
  }

  /** @param {import("./diagcalc-types").Snapshot} snapshot */
  function fingerprint(snapshot) {
    return JSON.stringify([snapshot.input, snapshot.options, snapshot.datasetKey, snapshot.modified, snapshot.engineVersion]);
  }

  function isSnapshot(entry) {
    if (!entry || typeof entry !== "object" || entry.schemaVersion !== meta.schemaVersion) return false;
    if (!core.validateInputs(entry.input).valid || !entry.options || !modes.includes(entry.options.continuityCorrection)) return false;
    if (typeof entry.label !== "string" || entry.label.length > 200 || typeof entry.id !== "string" || entry.id.length > 100) return false;
    if (typeof entry.savedAt !== "string" || !Number.isFinite(Date.parse(entry.savedAt))) return false;
    if (typeof entry.engineVersion !== "string" || !/^\d+\.\d+\.\d+$/.test(entry.engineVersion)) return false;
    if (entry.datasetKey !== null && (typeof entry.datasetKey !== "string" || entry.datasetKey.length > 100)) return false;
    return entry.metrics && metricKeys.every((key) => {
      const metric = entry.metrics[key];
      return validNumber(metric) && (metric.ci === null ||
        metric.ci && validNumber(metric.ci.lower) && validNumber(metric.ci.upper));
    });
  }

  function sanitiseProvenance(provenance) {
    if (!provenance || typeof provenance !== "object" || Array.isArray(provenance)) return null;
    const fields = ["kind", "sourceLocation", "extraction", "threshold", "referenceStandard", "outcome", "population", "reviewStatus", "note"];
    return Object.fromEntries(fields.map((key) => [key,
      typeof provenance[key] === "string" ? provenance[key].slice(0, 4000) : null,
    ]));
  }

  /** @param {unknown} raw @param {number} [limit] @returns {import("./diagcalc-types").Snapshot[]} */
  function parseHistory(raw, limit = 10) {
    if (typeof raw !== "string" || raw.length > 200000) return [];
    let entries;
    try { entries = JSON.parse(raw); } catch (_) { return []; }
    if (!Array.isArray(entries)) return [];
    const clean = [];
    const ids = new Set();
    for (const entry of entries.slice(0, 100)) {
      let snapshot = entry;
      if (entry && entry.schemaVersion === undefined && core.validateInputs(entry.input).valid && typeof entry.label === "string") {
        snapshot = createSnapshot(entry.input, {}, {
          id: String(entry.id), savedAt: entry.savedAt, label: entry.label,
          datasetKey: entry.datasetKey, legacy: true,
        });
      }
      if (!isSnapshot(snapshot) || ids.has(snapshot.id)) continue;
      ids.add(snapshot.id);
      // Copy only validated fields; never trust persisted summaries or HTML.
      clean.push({
        schemaVersion: snapshot.schemaVersion, engineVersion: snapshot.engineVersion,
        id: snapshot.id, savedAt: snapshot.savedAt, label: snapshot.label,
        datasetKey: snapshot.datasetKey, modified: Boolean(snapshot.modified), legacy: Boolean(snapshot.legacy),
        provenance: sanitiseProvenance(snapshot.provenance),
        input: { tp: snapshot.input.tp, fp: snapshot.input.fp, fn: snapshot.input.fn, tn: snapshot.input.tn, preTestProb: snapshot.input.preTestProb },
        options: { continuityCorrection: snapshot.options.continuityCorrection }, metrics: snapshot.metrics,
      });
      if (clean.length >= limit) break;
    }
    return clean;
  }

  /** @param {import("./diagcalc-types").Snapshot} snapshot */
  function summary(snapshot) {
    return Object.fromEntries(metricKeys.map((key) => [key, decodeNumber(snapshot.metrics[key])]));
  }

  /** @param {import("./diagcalc-types").CalculationOptions} options */
  function methodMetadata(options) {
    const mode = options.continuityCorrection;
    const correction = mode === "always" ? "+0.5 in every table" : mode === "never" ? "no continuity correction" : "+0.5 when a cell is zero";
    return {
      proportions: "Wilson 95%",
      likelihoodRatios: `Simel-Samsa-Matchar 1991 log-normal 95%; ${correction}`,
      postTestProbabilities: "Monotonic Bayes transformation of LR interval endpoints; fixed pre-test probability",
      diagnosticOddsRatio: `Log-normal 95%; ${correction}`,
    };
  }

  return { createSnapshot, fingerprint, parseHistory, summary, encodeNumber, decodeNumber, serialiseMetric, methodMetadata };
}));
