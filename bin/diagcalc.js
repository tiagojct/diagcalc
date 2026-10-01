#!/usr/bin/env node

const core = require("../lib/diagcalc-core");
const datasetStore = require("../lib/diagcalc-datasets");
const pkg = require("../package.json");

const caseStore = require("../lib/diagcalc-case");

function parseArgs(argv) {
  const flags = new Set(["help", "tui", "chain", "list-datasets"]);
  const values = new Set(["dataset", "tp", "fp", "fn", "tn", "pre", "tp2", "fp2", "fn2", "tn2", "chain-from", "format", "continuity"]);
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) return { error: `Unexpected argument: ${token}` };
    const [key, ...parts] = token.slice(2).split("=");
    if (!flags.has(key) && !values.has(key)) return { error: `Unknown option: --${key}` };
    if (Object.prototype.hasOwnProperty.call(args, key)) return { error: `Duplicate option: --${key}` };
    if (flags.has(key)) {
      if (parts.length) return { error: `--${key} does not take a value.` };
      args[key] = true;
      continue;
    }
    const value = parts.length ? parts.join("=") : argv[++index];
    if (value === undefined || value === "" || value.startsWith("--")) return { error: `Missing value for --${key}.` };
    args[key] = value;
  }
  if (!args.chain && ["tp2", "fp2", "fn2", "tn2", "chain-from"].some((key) => key in args)) {
    return { error: "Second-test options require --chain." };
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
    "  diag --dataset ddimer --chain --tp2 90 --fp2 10 --fn2 10 --tn2 90",
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
    "  --chain           Compute a second test using test 1's post-test as pre-test",
    "  --tp2 --fp2 --fn2 --tn2  Second test's confusion matrix (with --chain)",
    "  --chain-from <r>  positive (default) | negative — which test 1 result to follow",
    "  --format <type>   Output format: text or json",
    "  --continuity <m>  Continuity correction for LR/DOR CIs: auto (default), always, never",
    "  --list-datasets   Show available dataset keys",
    "  --help            Show this help message",
    "",
    "Tip:",
    "  Run `npm link` in this repo to use `diag` globally.",
    "",
  ].join("\n"));
}

function printJsonReport(dataset, input, metrics, chained, warnings, continuity) {
  const modified = Boolean(dataset && ["tp", "fp", "fn", "tn", "preTestProb"].some((key) => input[key] !== dataset[key]));
  const snapshot = caseStore.createSnapshot(input, { continuityCorrection: continuity }, {
    label: dataset ? `${modified ? "Customised: " : ""}${dataset.name}` : "Ad hoc case",
    datasetKey: dataset ? dataset.key : null,
    modified,
    provenance: dataset ? dataset.provenance : null,
  });
  const payload = {
    ...snapshot,
    engine: { name: "diagcalc", version: pkg.version, generatedAt: snapshot.savedAt, ciMethods: caseStore.methodMetadata(snapshot.options) },
    case: snapshot.label,
    warnings,
    metrics: Object.fromEntries(Object.entries(metrics).map(([key, metric]) => [key, {
      ...snapshot.metrics[key], label: metric.label,
      formatted: core.formatValue(metric.value, metric.formatter), note: metric.note,
    }])),
  };
  if (chained) {
    payload.chained = {
      ...caseStore.createSnapshot(chained.input, { continuityCorrection: continuity }, { label: "Chained second test" }),
      from: chained.from,
      assumption: "Test results are conditionally independent given disease status.",
      warnings: core.buildBiasWarnings(chained.input),
    };
  }
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
    merged.preTestProb = core.parseProbability(args.pre);
  }

  return {
    dataset: dataset ? { key: args.dataset, ...dataset } : null,
    input: merged,
  };
}

function renderMetricLine(metric) {
  const value = core.formatValue(metric.value, metric.formatter);
  const ci = metric.ci
    ? ` | 95% CI ${core.formatValue(metric.ci.lower, metric.formatter)} to ${core.formatValue(metric.ci.upper, metric.formatter)}`
    : "";
  return `${metric.label}: ${value}${ci}`;
}

function printReport(dataset, metrics, warnings) {
  const entries = [
    metrics.sensitivity,
    metrics.specificity,
    metrics.ppv,
    metrics.npv,
    metrics.dor,
    metrics.numberNeededToScreen,
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
  if (Array.isArray(warnings) && warnings.length > 0) {
    lines.push("Heads up:");
    for (const w of warnings) {
      lines.push(`  - ${w}`);
    }
    lines.push("");
  }
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
  if (args.error) {
    process.stderr.write(`${args.error}\n`);
    process.exitCode = 1;
    return;
  }

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

  const continuity = typeof args.continuity === "string" ? args.continuity.toLowerCase() : "auto";
  if (!["auto", "always", "never"].includes(continuity)) {
    process.stderr.write(`Invalid --continuity value. Use auto, always, or never.\n`);
    process.exitCode = 1;
    return;
  }
  const metrics = core.calculateMetrics(built.input, { continuityCorrection: continuity });
  if (args.format !== undefined && typeof args.format !== "string") {
    process.stderr.write("Missing value for --format. Use --format text or --format json.\n");
    process.exitCode = 1;
    return;
  }
  const format = typeof args.format === "string" ? args.format.toLowerCase() : "text";

  let chained = null;
  if (args.chain) {
    chained = buildChainedTest(args, metrics, continuity);
    if (chained.error) {
      process.stderr.write(`${chained.error}\n`);
      process.exitCode = 1;
      return;
    }
  }

  const warnings = [...core.buildBiasWarnings(built.input), ...datasetStore.buildDatasetWarnings(built.dataset)];

  if (format === "json") {
    printJsonReport(built.dataset, built.input, metrics, chained, warnings, continuity);
    return;
  }

  if (format !== "text") {
    process.stderr.write("Unsupported format. Use --format text or --format json.\n");
    process.exitCode = 1;
    return;
  }

  const modified = built.dataset && ["tp", "fp", "fn", "tn", "preTestProb"].some((key) => built.input[key] !== built.dataset[key]);
  printReport(built.dataset ? { ...built.dataset, name: `${modified ? "Customised: " : ""}${built.dataset.name}` } : null, metrics, warnings);
  process.stdout.write(`Engine ${pkg.version}; continuity correction: ${continuity}.\n`);
  if (chained) {
    printChainedReport(chained);
  }
}

function buildChainedTest(args, firstMetrics, continuity) {
  const from = typeof args["chain-from"] === "string" ? args["chain-from"].toLowerCase() : "positive";
  if (from !== "positive" && from !== "negative") {
    return { error: "Invalid --chain-from. Use 'positive' or 'negative'." };
  }
  const sourceProb = from === "negative" ? firstMetrics.postTestNegative.value : firstMetrics.postTestPositive.value;
  if (!Number.isFinite(sourceProb)) {
    return { error: "Test 1's post-test probability is not finite; cannot chain." };
  }
  const preTestProb = core.chainedPreTestProbability(sourceProb);

  const input = {
    tp: typeof args.tp2 === "string" ? core.safeParseInt(args.tp2) : NaN,
    fp: typeof args.fp2 === "string" ? core.safeParseInt(args.fp2) : NaN,
    fn: typeof args.fn2 === "string" ? core.safeParseInt(args.fn2) : NaN,
    tn: typeof args.tn2 === "string" ? core.safeParseInt(args.tn2) : NaN,
    preTestProb,
  };
  const validation = core.validateInputs(input);
  if (!validation.valid) {
    return { error: `Test 2 validation failed: ${validation.message}` };
  }
  return {
    from,
    input,
    metrics: core.calculateMetrics(input, { continuityCorrection: continuity }),
  };
}

function printChainedReport(chained) {
  process.stdout.write(`\n— Chained second test (following test 1's ${chained.from} result) —\n`);
  process.stdout.write("Assumption: results are conditionally independent given disease status.\n");
  process.stdout.write(`Test 2 pre-test probability: ${core.formatPercentage(chained.input.preTestProb / 100)}\n\n`);
  const entries = [
    chained.metrics.sensitivity,
    chained.metrics.specificity,
    chained.metrics.ppv,
    chained.metrics.npv,
    chained.metrics.dor,
    chained.metrics.numberNeededToScreen,
    chained.metrics.lrPositive,
    chained.metrics.lrNegative,
    chained.metrics.postTestPositive,
    chained.metrics.postTestNegative,
  ];
  entries.forEach((metric) => {
    process.stdout.write(`${renderMetricLine(metric)}\n`);
  });
  process.stdout.write("\n");
}

main();
