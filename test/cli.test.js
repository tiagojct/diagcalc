const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const entry = path.join(__dirname, "../bin/diagcalc.js");
const cli = (...args) => spawnSync(process.execPath, [entry, ...args], { encoding: "utf8" });

for (const args of [["--pre"], ["--tp"], ["--continuty", "never"], ["--pre", "20garbage"],
  ["--tp", "9007199254740993"], ["--pre", "-5"], ["--dataset", "ddimer", "--dataset", "hiv_elisa"],
  ["--help=yes"], ["--tp2", "10"], ["unexpected"]]) {
  test(`CLI rejects ${args.join(" ")} rather than using a preset fallback`, () => {
    const result = cli("--dataset", "ddimer", ...args);
    assert.equal(result.status, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.trim());
  });
}

test("CLI validates syntax-only options before matrix data", () => {
  for (const [args, message] of [
    [["--format", "xml"], /Unsupported format/],
    [["--continuity", "sometimes"], /Invalid --continuity/],
    [["--chain", "--chain-from", "sideways", "--tp2", "1", "--fp2", "1", "--fn2", "1", "--tn2", "1"], /Invalid --chain-from/],
  ]) {
    const result = cli(...args);
    assert.equal(result.status, 1, args.join(" "));
    assert.equal(result.stdout, "");
    assert.match(result.stderr, message);
  }
});

test("CLI text, help and dataset-list success paths stay stable", () => {
  const text = cli("--dataset", "ddimer");
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /Sensitivity: 97.5%/);
  assert.match(text.stdout, /Pre-test bar/);
  assert.match(text.stdout, /Engine \d+\.\d+\.\d+/);
  const customised = cli("--dataset", "ddimer", "--tp", "100");
  assert.match(customised.stdout, /Customised: D-dimer/);
  const help = cli("--help");
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage:/);
  const list = cli("--list-datasets");
  assert.equal(list.status, 0);
  assert.match(list.stdout, /ddimer/);
});

test("CLI chained JSON metrics have the same decorated shape as test 1", () => {
  const report = JSON.parse(cli("--dataset", "ddimer", "--format", "json",
    "--chain", "--tp2", "50", "--fp2", "10", "--fn2", "10", "--tn2", "50").stdout);
  for (const key of ["sensitivity", "lrPositive", "postTestNegative"]) {
    assert.equal(typeof report.chained.metrics[key].label, "string");
    assert.equal(typeof report.chained.metrics[key].formatted, "string");
    assert.equal(typeof report.chained.metrics[key].note, "string");
    assert.equal(report.chained.metrics[key].status, report.metrics[key].status);
  }
});

test("CLI JSON records actual settings, methods, case modification, and provenance", () => {
  const result = cli("--dataset", "ddimer", "--tp", "100", "--continuity", "never", "--format", "json");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.schemaVersion, 2);
  assert.equal(report.options.continuityCorrection, "never");
  assert.match(report.engine.ciMethods.likelihoodRatios, /no continuity correction/);
  assert.equal(report.modified, true);
  assert.match(report.case, /Customised/);
  assert.equal(report.provenance.kind, "illustrative");
  assert.ok(report.warnings.some((warning) => /Illustrative/.test(warning)));
});

test("CLI chains exact certainty and exposes impossible outcomes without rounding", () => {
  const result = cli("--tp", "50", "--fp", "0", "--fn", "0", "--tn", "50", "--pre", "20", "--format", "json",
    "--chain", "--tp2", "50", "--fp2", "0", "--fn2", "0", "--tn2", "50");
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.metrics.lrPositive.status, "infinite");
  assert.equal(report.chained.input.preTestProb, 100);
  assert.equal(report.chained.metrics.postTestNegative.status, "undefined");
  assert.match(report.chained.assumption, /conditionally independent/);
});

test("CLI text and JSON report the same second-test warnings", () => {
  const args = ["--tp", "50", "--fp", "0", "--fn", "0", "--tn", "50", "--pre", "20",
    "--chain", "--tp2", "5", "--fp2", "5", "--fn2", "5", "--tn2", "5"];
  const text = cli(...args);
  assert.equal(text.status, 0, text.stderr);
  assert.match(text.stdout, /Heads up \(test 2\):[\s\S]*Small diseased group/);
  const report = JSON.parse(cli(...args, "--format", "json").stdout);
  assert.ok(report.chained.warnings.some((warning) => /Small diseased group/.test(warning)));
  assert.ok(report.chained.warnings.some((warning) => /Small non-diseased group/.test(warning)));
});

test("CLI marks intervals that used continuity correction", () => {
  const report = JSON.parse(cli("--tp", "50", "--fp", "0", "--fn", "5", "--tn", "100", "--pre", "30", "--format", "json").stdout);
  assert.equal(report.metrics.lrPositive.status, "infinite");
  assert.equal(report.metrics.lrPositive.ci.corrected, true);
  assert.equal(report.metrics.postTestPositive.ci.corrected, true);
  const clean = JSON.parse(cli("--dataset", "ddimer", "--format", "json").stdout);
  assert.equal(clean.metrics.lrPositive.ci.corrected, false);
});

test("CLI comma decimals and equals syntax use complete parsing", () => {
  const result = cli("--dataset=ddimer", "--pre=20,5", "--format=json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).input.preTestProb, 20.5);
});
