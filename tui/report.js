const core = require("../lib/diagcalc-core");
const caseStore = require("../lib/diagcalc-case");
const meta = require("../lib/diagcalc-meta");
const datasetStore = require("../lib/diagcalc-datasets");
const { renderConfidence } = require("./presentation");
const displayValue = (value) => Number.isFinite(value) ? String(value) : "—";
const formatPreTest = (value) => core.formatPercentage(value / 100);

function buildTextExport(state, metrics, validation) {
  const lines = [
    `DIAGCALC - ${state.activeCaseLabel}`,
    "",
    `Engine ${meta.version}; continuity correction: auto`,
    "Confusion matrix",
    `  TP ${displayValue(state.input.tp)}   FP ${displayValue(state.input.fp)}`,
    `  FN ${displayValue(state.input.fn)}   TN ${displayValue(state.input.tn)}`,
    `  Pre-test probability ${formatPreTest(state.input.preTestProb)}`,
    "",
  ];

  if (!validation.valid || !metrics) {
    lines.push(`Validation: ${validation.message}`);
    return `${lines.join("\n")}\n`;
  }

  lines.push(...datasetStore.buildDatasetWarnings(datasetStore.getDataset(state.originDatasetKey || state.activeDatasetKey)));
  lines.push(...core.buildBiasWarnings(state.input));
  lines.push(...buildPlainMetricSections(metrics));
  lines.push("", "Reproducible snapshot (JSON)", JSON.stringify(reportSnapshot(state), null, 2));
  return `${lines.join("\n")}\n`;
}

function buildMarkdownExport(state, metrics, validation) {
  const lines = [
    `# DIAGCALC - ${state.activeCaseLabel}`,
    "",
    `Engine ${meta.version}; continuity correction: auto`,
    "## Case Input",
    "",
    "|                | Disease + | Disease - |",
    "|----------------|-----------|-----------|",
    `| Test +         | ${displayValue(state.input.tp)} | ${displayValue(state.input.fp)} |`,
    `| Test -         | ${displayValue(state.input.fn)} | ${displayValue(state.input.tn)} |`,
    "",
    `Pre-test probability: ${formatPreTest(state.input.preTestProb)}`,
    "",
  ];

  if (!validation.valid || !metrics) {
    lines.push("## Validation");
    lines.push("");
    lines.push(validation.message);
    lines.push("");
    return `${lines.join("\n")}`;
  }

  lines.push(...datasetStore.buildDatasetWarnings(datasetStore.getDataset(state.originDatasetKey || state.activeDatasetKey)));
  lines.push(...core.buildBiasWarnings(state.input));
  lines.push(...buildMarkdownMetricSections(metrics));
  lines.push("## Reproducible snapshot", "", "```json", JSON.stringify(reportSnapshot(state), null, 2), "```", "");
  return `${lines.join("\n")}`;
}

function reportSnapshot(state) {
  const origin = state.originDatasetKey || (state.activeDatasetKey !== "ad_hoc" ? state.activeDatasetKey : null);
  const snapshot = caseStore.createSnapshot(state.input, {}, {
    label: state.activeCaseLabel, datasetKey: origin,
    modified: Boolean(origin && state.activeDatasetKey === "ad_hoc"),
    provenance: datasetStore.getDataset(origin)?.provenance || null,
  });
  return { calculation: snapshot, previousTest: state.previousTestSnapshot || null,
    chainingAssumption: state.previousTestSnapshot ? "Tests are conditionally independent given disease status" : null };
}

function buildPlainMetricSections(metrics) {
  return [
    "Performance Measures",
    `  Sensitivity: ${core.formatValue(metrics.sensitivity.value)} (${renderConfidence(metrics.sensitivity)})`,
    `  Specificity: ${core.formatValue(metrics.specificity.value)} (${renderConfidence(metrics.specificity)})`,
    `  PPV: ${core.formatValue(metrics.ppv.value)} (${renderConfidence(metrics.ppv)})`,
    `  NPV: ${core.formatValue(metrics.npv.value)} (${renderConfidence(metrics.npv)})`,
    `  DOR: ${core.formatValue(metrics.dor.value, metrics.dor.formatter)} (${renderConfidence(metrics.dor)})`,
    `  NNS: ${core.formatValue(metrics.numberNeededToScreen.value, metrics.numberNeededToScreen.formatter)}`,
    "",
    "Bayesian Update",
    `  LR+: ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)} (${renderConfidence(metrics.lrPositive)})`,
    `  LR-: ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)} (${renderConfidence(metrics.lrNegative)})`,
    `  Post-test probability (+): ${core.formatValue(metrics.postTestPositive.value)} (${renderConfidence(metrics.postTestPositive)})`,
    `  Post-test probability (-): ${core.formatValue(metrics.postTestNegative.value)} (${renderConfidence(metrics.postTestNegative)})`,
    "",
    "Interpretation",
    `  Sensitivity: ${metrics.sensitivity.note}`,
    `  Specificity: ${metrics.specificity.note}`,
    `  LR+: ${metrics.lrPositive.note}`,
    `  LR-: ${metrics.lrNegative.note}`,
  ];
}

function buildMarkdownMetricSections(metrics) {
  return [
    "## Performance Measures",
    "",
    "| Metric | Value | Confidence interval |",
    "|--------|-------|---------------------|",
    `| Sensitivity | ${core.formatValue(metrics.sensitivity.value)} | ${renderConfidence(metrics.sensitivity)} |`,
    `| Specificity | ${core.formatValue(metrics.specificity.value)} | ${renderConfidence(metrics.specificity)} |`,
    `| PPV | ${core.formatValue(metrics.ppv.value)} | ${renderConfidence(metrics.ppv)} |`,
    `| NPV | ${core.formatValue(metrics.npv.value)} | ${renderConfidence(metrics.npv)} |`,
    `| DOR | ${core.formatValue(metrics.dor.value, metrics.dor.formatter)} | ${renderConfidence(metrics.dor)} |`,
    `| NNS | ${core.formatValue(metrics.numberNeededToScreen.value, metrics.numberNeededToScreen.formatter)} | — |`,
    "",
    "## Bayesian Update",
    "",
    `- LR+: ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)}${metrics.lrPositive.ci ? ` (95% CI ${core.formatValue(metrics.lrPositive.ci.lower, metrics.lrPositive.formatter)} – ${core.formatValue(metrics.lrPositive.ci.upper, metrics.lrPositive.formatter)})` : ""}`,
    `- LR-: ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)}${metrics.lrNegative.ci ? ` (95% CI ${core.formatValue(metrics.lrNegative.ci.lower, metrics.lrNegative.formatter)} – ${core.formatValue(metrics.lrNegative.ci.upper, metrics.lrNegative.formatter)})` : ""}`,
    `- Pre-test probability: ${core.formatValue(metrics.preTestProbability.value)}`,
    `- Post-test probability (+): ${core.formatValue(metrics.postTestPositive.value)}${metrics.postTestPositive.ci ? ` (95% CI ${core.formatPercentage(metrics.postTestPositive.ci.lower)} – ${core.formatPercentage(metrics.postTestPositive.ci.upper)})` : ""}`,
    `- Post-test probability (-): ${core.formatValue(metrics.postTestNegative.value)}${metrics.postTestNegative.ci ? ` (95% CI ${core.formatPercentage(metrics.postTestNegative.ci.lower)} – ${core.formatPercentage(metrics.postTestNegative.ci.upper)})` : ""}`,
    "",
    "## Interpretation",
    "",
    `- Sensitivity: ${metrics.sensitivity.note}`,
    `- Specificity: ${metrics.specificity.note}`,
    `- LR+: ${metrics.lrPositive.note}`,
    `- LR-: ${metrics.lrNegative.note}`,
    "",
  ];
}

module.exports = { buildTextExport, buildMarkdownExport };
