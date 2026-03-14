#!/usr/bin/env node

const core = require("../lib/diagcalc-core");
const datasetStore = require("../lib/diagcalc-datasets");

function parseArgs(argv) {
  const args = {
    raw: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      args.raw.push(token);
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];
    const isFlag = !next || next.startsWith("--");

    if (isFlag) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function printHelp() {
  process.stdout.write([
    "DIAGCALC terminal tools",
    "",
    "Usage:",
    "  diag --tui",
    "  diag --dataset hiv_elisa",
    "  diag --tp 199 --fp 1 --fn 1 --tn 9799 --pre 2",
    "  diag --dataset ddimer --pre 18",
    "  diag --list-datasets",
    "",
    "Options:",
    "  --tui             Launch the interactive terminal UI",
    "  --dataset <key>   Load a predefined scenario",
    "  --tp <n>          True positives",
    "  --fp <n>          False positives",
    "  --fn <n>          False negatives",
    "  --tn <n>          True negatives",
    "  --pre <n>         Pre-test probability (%)",
    "  --format <type>   Output format: text or json",
    "  --list-datasets   Show available dataset keys",
    "  --help            Show this help message",
    "",
    "Tip:",
    "  Run `npm link` in this repo to use `diag` globally.",
    "",
  ].join("\n"));
}

function serialiseMetric(metric) {
  return {
    label: metric.label,
    value: metric.value,
    formatted: core.formatValue(metric.value, metric.formatter),
    ci: metric.ci || null,
    note: metric.note || null,
  };
}

function printJsonReport(dataset, input, metrics) {
  const payload = {
    case: dataset ? dataset.name : "Ad hoc case",
    datasetKey: dataset ? dataset.key || null : null,
    input,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, metric]) => [key, serialiseMetric(metric)])),
  };

  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function printDatasets() {
  const rows = datasetStore.listDatasets().map((dataset) => `${dataset.key.padEnd(16)} ${dataset.name}`);
  process.stdout.write(`Available datasets\n\n${rows.join("\n")}\n`);
}

function buildInputFromArgs(args) {
  const dataset = args.dataset ? datasetStore.getDataset(args.dataset) : null;
  if (args.dataset && !dataset) {
    return {
      error: `Unknown dataset: ${args.dataset}`,
    };
  }

  const merged = {
    tp: dataset ? dataset.tp : NaN,
    fp: dataset ? dataset.fp : NaN,
    fn: dataset ? dataset.fn : NaN,
    tn: dataset ? dataset.tn : NaN,
    preTestProb: dataset ? dataset.preTestProb : NaN,
  };

  if (typeof args.tp === "string") {
    merged.tp = core.safeParseInt(args.tp);
  }
  if (typeof args.fp === "string") {
    merged.fp = core.safeParseInt(args.fp);
  }
  if (typeof args.fn === "string") {
    merged.fn = core.safeParseInt(args.fn);
  }
  if (typeof args.tn === "string") {
    merged.tn = core.safeParseInt(args.tn);
  }
  if (typeof args.pre === "string") {
    const normalised = core.normaliseDecimal(args.pre);
    merged.preTestProb = normalised === "" ? NaN : parseFloat(normalised);
  }

  return {
    dataset: dataset ? { key: args.dataset, ...dataset } : null,
    input: merged,
  };
}

function renderMetricLine(metric) {
  const value = core.formatValue(metric.value, metric.formatter);
  const ci = metric.ci
    ? ` | 95% CI ${core.formatPercentage(metric.ci.lower)} to ${core.formatPercentage(metric.ci.upper)}`
    : "";
  return `${metric.label}: ${value}${ci}`;
}

function printReport(dataset, metrics) {
  const entries = [
    metrics.sensitivity,
    metrics.specificity,
    metrics.ppv,
    metrics.npv,
    metrics.lrPositive,
    metrics.lrNegative,
    metrics.preTestProbability,
    metrics.postTestPositive,
    metrics.postTestNegative,
  ];

  const lines = [];
  lines.push("DIAGCALC");
  if (dataset) {
    lines.push(dataset.name);
  }
  lines.push("");
  entries.forEach((metric) => {
    lines.push(renderMetricLine(metric));
  });
  lines.push("");
  lines.push(`Pre-test bar       [${core.buildProbabilityBar(metrics.preTestProbability.value, 24)}] ${core.formatPercentage(metrics.preTestProbability.value)}`);
  lines.push(`Post-test (+) bar  [${core.buildProbabilityBar(metrics.postTestPositive.value, 24)}] ${core.formatPercentage(metrics.postTestPositive.value)}`);
  lines.push(`Post-test (-) bar  [${core.buildProbabilityBar(metrics.postTestNegative.value, 24)}] ${core.formatPercentage(metrics.postTestNegative.value)}`);
  lines.push("");
  lines.push(`Interpretation LR+: ${metrics.lrPositive.note}`);
  lines.push(`Interpretation LR-: ${metrics.lrNegative.note}`);
  lines.push("");

  process.stdout.write(`${lines.join("\n")}\n`);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  if (args["list-datasets"]) {
    printDatasets();
    return;
  }

  if (args.tui || (process.argv.length === 2 && process.stdout.isTTY && process.stdin.isTTY)) {
    const { runTui } = require("../tui/index");
    runTui();
    return;
  }

  if (process.argv.length === 2) {
    printHelp();
    return;
  }

  const built = buildInputFromArgs(args);
  if (built.error) {
    process.stderr.write(`${built.error}\n`);
    process.exitCode = 1;
    return;
  }

  const validation = core.validateInputs(built.input);
  if (!validation.valid) {
    process.stderr.write(`${validation.message}\n`);
    process.exitCode = 1;
    return;
  }

  const metrics = core.calculateMetrics(built.input);
  const format = typeof args.format === "string" ? args.format.toLowerCase() : "text";
  if (format === "json") {
    printJsonReport(built.dataset, built.input, metrics);
    return;
  }

  if (format !== "text") {
    process.stderr.write("Unsupported format. Use --format text or --format json.\n");
    process.exitCode = 1;
    return;
  }

  printReport(built.dataset, metrics);
}

main();
