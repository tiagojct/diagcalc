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

test("CLI comma decimals and equals syntax use complete parsing", () => {
  const result = cli("--dataset=ddimer", "--pre=20,5", "--format=json");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).input.preTestProb, 20.5);
});
