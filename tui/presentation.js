const core = require("../lib/diagcalc-core");

function renderResults(metrics) {
  const performance = [
    renderMetricLine(metrics.sensitivity, "sensitivity"),
    renderMetricLine(metrics.specificity, "specificity"),
    renderMetricLine(metrics.ppv, "ppv"),
    renderMetricLine(metrics.npv, "npv"),
    renderMetricLine(metrics.dor, "dor"),
    renderMetricLine(metrics.numberNeededToScreen, "nns"),
  ];

  const bayes = [
    renderMetricLine(metrics.lrPositive, "lrPositive"),
    renderMetricLine(metrics.lrNegative, "lrNegative"),
    renderMetricLine(metrics.preTestProbability, "neutral"),
    renderMetricLine(metrics.postTestPositive, "postPositive"),
    renderMetricLine(metrics.postTestNegative, "postNegative"),
  ];

  const bars = [
    `Pre-test      [${core.buildProbabilityBar(metrics.preTestProbability.value, 24)}] ${core.formatPercentage(metrics.preTestProbability.value)}`,
    `Post-test (+) [${core.buildProbabilityBar(metrics.postTestPositive.value, 24)}] ${core.formatPercentage(metrics.postTestPositive.value)}`,
    `Post-test (-) [${core.buildProbabilityBar(metrics.postTestNegative.value, 24)}] ${core.formatPercentage(metrics.postTestNegative.value)}`,
  ];

  return [
    "{bold}Performance Measures{/bold}",
    performance.join("\n"),
    "",
    "{bold}Bayesian Update{/bold}",
    bayes.join("\n"),
    "",
    "{bold}Probability Shift{/bold}",
    bars.join("\n"),
    "",
    "{bold}Interpretation{/bold}",
    `Sensitivity  ${metrics.sensitivity.note}`,
    `Specificity  ${metrics.specificity.note}`,
    `LR+          ${metrics.lrPositive.note}`,
    `LR-          ${metrics.lrNegative.note}`,
  ].join("\n");
}

function renderMetricLine(metric, kind) {
  const value = core.formatValue(metric.value, metric.formatter);
  const valueTag = colourValue(value, kind, metric.value);
  const confidence = renderConfidence(metric);
  const confidenceText = confidence ? `  {gray-fg}${confidence}{/}` : "";
  return `${metric.label.padEnd(36)} ${valueTag}${confidenceText}`;
}

function renderConfidence(metric) {
  if (!metric.ci) {
    return "";
  }

  const lo = core.formatValue(metric.ci.lower, metric.formatter);
  const hi = core.formatValue(metric.ci.upper, metric.formatter);
  return `95% CI ${lo} to ${hi}${metric.ci.corrected ? " (continuity-corrected)" : ""}`;
}

function colourValue(value, kind, numericValue) {
  const { colour, badge } = metricTone(kind, numericValue);
  return `{${colour}-fg}${value}{/} {bold}{${colour}-fg}[${badge}]{/}{/}`;
}

// Pequod crew accents — dark variants (TUI assumes dark terminal background)
const CREW = {
  ahab:     "#E3877C", // red — WEAK / LOW / HIGH
  starbuck: "#A6DFFF", // cyan — INFO
  queequeg: "#838CCF", // blue — primary / selection / focus
  pip:      "#DEC577", // gold — MOD / USEFUL / LIMITED / MID
  ishmael:  "#BFBBB6", // warm gray — borders / muted
  stubb:    "#FFD9BB", // warm orange — LR+ accent
  tashtego: "#82C4A2", // green — STRONG / RULE-IN / RULE-OUT / HIGH(post+) / LOW(post-)
  daggoo:   "#A17069", // brown — EXTREME (infinite values) / second-stage trace
};

function metricTone(kind, value) {
  if (Number.isNaN(value)) return { colour: CREW.ishmael, badge: "UNDEFINED" };
  if (!Number.isFinite(value)) {
    return { colour: CREW.daggoo, badge: "EXTREME" };
  }

  if (kind === "sensitivity" || kind === "specificity" || kind === "ppv" || kind === "npv") {
    if (value >= 0.9) {
      return { colour: CREW.tashtego, badge: "STRONG" };
    }
    if (value >= 0.7) {
      return { colour: CREW.pip, badge: "MOD" };
    }
    return { colour: CREW.ahab, badge: "WEAK" };
  }

  if (kind === "lrPositive") {
    if (value >= 10) {
      return { colour: CREW.tashtego, badge: "RULE-IN" };
    }
    if (value >= 5) {
      return { colour: CREW.pip, badge: "USEFUL" };
    }
    if (value >= 2) {
      return { colour: CREW.pip, badge: "LIMITED" };
    }
    return { colour: CREW.ahab, badge: "WEAK" };
  }

  if (kind === "dor") {
    if (value >= 100) {
      return { colour: CREW.tashtego, badge: "VERY STRONG" };
    }
    if (value >= 10) {
      return { colour: CREW.tashtego, badge: "USEFUL" };
    }
    if (value > 1) {
      return { colour: CREW.pip, badge: "LIMITED" };
    }
    return { colour: CREW.ahab, badge: "POOR" };
  }

  if (kind === "nns") {
    if (value < 10) {
      return { colour: CREW.tashtego, badge: "EFFICIENT" };
    }
    if (value < 100) {
      return { colour: CREW.pip, badge: "MODERATE" };
    }
    return { colour: CREW.ahab, badge: "LOW YIELD" };
  }

  if (kind === "lrNegative") {
    if (value <= 0.1) {
      return { colour: CREW.tashtego, badge: "RULE-OUT" };
    }
    if (value <= 0.2) {
      return { colour: CREW.pip, badge: "USEFUL" };
    }
    if (value <= 0.5) {
      return { colour: CREW.pip, badge: "LIMITED" };
    }
    return { colour: CREW.ahab, badge: "WEAK" };
  }

  if (kind === "postPositive") {
    if (value >= 0.8) {
      return { colour: CREW.tashtego, badge: "HIGH" };
    }
    if (value >= 0.4) {
      return { colour: CREW.pip, badge: "MID" };
    }
    return { colour: CREW.ahab, badge: "LOW" };
  }

  if (kind === "postNegative") {
    if (value <= 0.1) {
      return { colour: CREW.tashtego, badge: "LOW" };
    }
    if (value <= 0.3) {
      return { colour: CREW.pip, badge: "MID" };
    }
    return { colour: CREW.ahab, badge: "HIGH" };
  }

  return { colour: CREW.starbuck, badge: "INFO" };
}

module.exports = { renderResults, renderConfidence, CREW };
