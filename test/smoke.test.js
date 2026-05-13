"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const HTML = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");

// Parse the local-only <script src> and <link href> references out of index.html.
const SCRIPT_SRCS = [...HTML.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)].map((m) => m[1]);
const STYLE_HREFS = [...HTML.matchAll(/<link[^>]*\brel="stylesheet"[^>]*\bhref="([^"]+)"/g)].map((m) => m[1]);
const isLocal = (url) => !/^https?:\/\//.test(url) && !url.startsWith("//");

// ── Asset-path smoke ────────────────────────────────────────────────────────
// The Pages workflow copies index.html, script.js, styles.css and lib/ into
// /public. Any local <script src> or <link href> that points outside that set
// will 404 in production.

test("every local <script src> in index.html points at an existing file", () => {
  const localScripts = SCRIPT_SRCS.filter(isLocal);
  assert.ok(localScripts.length > 0, "no local scripts referenced");
  for (const src of localScripts) {
    assert.ok(fs.existsSync(path.join(ROOT, src)), `missing script: ${src}`);
  }
});

test("every local stylesheet <link href> in index.html points at an existing file", () => {
  const localStyles = STYLE_HREFS.filter(isLocal);
  for (const href of localStyles) {
    assert.ok(fs.existsSync(path.join(ROOT, href)), `missing stylesheet: ${href}`);
  }
});

// ── Script-load order smoke ────────────────────────────────────────────────
// script.js consumes window.DiagcalcCore / DiagcalcDatasets / DiagcalcI18n,
// so the lib/ scripts must load before it.

test("script.js loads after every lib/ script it depends on", () => {
  const localScripts = SCRIPT_SRCS.filter(isLocal);
  const appIndex = localScripts.indexOf("script.js");
  assert.notEqual(appIndex, -1, "script.js must be referenced");
  const libScripts = localScripts.filter((s) => s.startsWith("lib/"));
  assert.ok(libScripts.length >= 2, "expected at least two lib/ scripts");
  for (const lib of libScripts) {
    const libIndex = localScripts.indexOf(lib);
    assert.ok(libIndex < appIndex, `${lib} must load before script.js`);
  }
});

// ── Deploy-bundle smoke ────────────────────────────────────────────────────
// Mirror what .github/workflows/deploy-pages.yml ships: index.html, script.js,
// styles.css, and the lib/ directory. Verify each piece is present.

test("the deploy bundle covers every local asset referenced by index.html", () => {
  const deployed = new Set(["index.html", "script.js", "styles.css"]);
  const localScripts = SCRIPT_SRCS.filter(isLocal);
  const localStyles = STYLE_HREFS.filter(isLocal);
  for (const asset of [...localScripts, ...localStyles]) {
    const inDeployed = deployed.has(asset) || asset.startsWith("lib/");
    assert.ok(inDeployed, `asset ${asset} is referenced but not in the Pages deploy bundle`);
  }
});

// ── Engine surface smoke ───────────────────────────────────────────────────
// If a contributor removes or renames a public export, the live page silently
// breaks (e.g. setFeedback shows nothing). Lock the contract.

test("the core module exports the public functions the UI relies on", () => {
  const core = require("../lib/diagcalc-core");
  for (const name of [
    "validateInputs", "calculateMetrics", "calculateThresholds", "calculateROC",
    "calcCohenKappa", "calcDOR", "calcLogRatioCI", "calcPostTestCI", "calcWilsonInterval",
    "buildBiasWarnings", "buildProbabilityBar",
    "formatValue", "formatPercentage", "formatLikelihood", "formatNNS",
    "safeParseInt", "normaliseDecimal", "clamp",
  ]) {
    assert.equal(typeof core[name], "function", `core.${name} is missing or not a function`);
  }
});

test("the datasets module exposes datasets, getDataset, listDatasets", () => {
  const ds = require("../lib/diagcalc-datasets");
  assert.equal(typeof ds.datasets, "object");
  assert.equal(typeof ds.getDataset, "function");
  assert.equal(typeof ds.listDatasets, "function");
});

test("the i18n module exposes its public surface and has both en and pt-PT tables", () => {
  const i18n = require("../lib/diagcalc-i18n");
  for (const name of ["t", "setLocale", "getLocale", "detectLocale", "applyToDom", "availableLocales", "translations"]) {
    assert.ok(i18n[name] !== undefined, `i18n.${name} missing`);
  }
  assert.ok(i18n.translations.en, "missing en locale");
  assert.ok(i18n.translations["pt-PT"], "missing pt-PT locale");
});

// ── i18n key-coverage smoke ───────────────────────────────────────────────
// Every data-i18n key in index.html must exist in both locales, so switching
// language never leaves an element with a missing string.

test("every data-i18n key in index.html resolves in both locales", () => {
  const i18n = require("../lib/diagcalc-i18n");
  const keys = new Set();
  for (const m of HTML.matchAll(/\bdata-i18n="([^"]+)"/g)) keys.add(m[1]);
  for (const m of HTML.matchAll(/\bdata-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(";")) {
      const [, key] = pair.split("=").map((s) => s.trim());
      if (key) keys.add(key);
    }
  }
  for (const key of keys) {
    assert.ok(i18n.translations.en[key] !== undefined, `missing en translation for ${key}`);
    assert.ok(i18n.translations["pt-PT"][key] !== undefined, `missing pt-PT translation for ${key}`);
  }
});
