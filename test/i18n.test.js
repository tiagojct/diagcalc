const test = require("node:test");
const assert = require("node:assert/strict");
const i18n = require("../lib/diagcalc-i18n");
const core = require("../lib/diagcalc-core");

test("every validation outcome has a Portuguese browser message and round-trips to English", () => {
  const base = { tp: 10, fp: 1, fn: 1, tn: 10, preTestProb: 20 };
  const inputs = [null, { ...base, tp: -1 }, { ...base, tp: 1.5 },
    { ...base, tp: Number.MAX_SAFE_INTEGER }, { ...base, preTestProb: NaN },
    { ...base, preTestProb: 101 }, { ...base, tp: 0, fn: 0 }, { ...base, fp: 0, tn: 0 }];
  for (const input of inputs) {
    const original = core.validateInputs(input).message;
    i18n.setLocale("pt-PT");
    const portuguese = i18n.message(original);
    assert.notEqual(portuguese, original);
    i18n.setLocale("en");
    assert.equal(i18n.relocalise(portuguese), original);
  }
});

test("dynamic bias messages retain their values across language changes", () => {
  const warnings = core.buildBiasWarnings({ tp: 5, fp: 2, fn: 1, tn: 8, preTestProb: 75 });
  assert.ok(warnings.length);
  for (const original of warnings) {
    i18n.setLocale("pt-PT");
    const translated = i18n.message(original);
    assert.notEqual(translated, original);
    i18n.setLocale("en");
    assert.equal(i18n.relocalise(translated), original);
  }
});

test("unsupported and prototype-chain locale values fall back to English", () => {
  for (const locale of ["constructor", "__proto__", "toString", "xx", null, 42]) {
    i18n.setLocale(locale);
    assert.equal(i18n.getLocale(), "en");
  }
  i18n.setLocale("pt-PT");
  assert.equal(i18n.getLocale(), "pt-PT");
  i18n.setLocale("en");
});

test("every dataset has name and description translations", () => {
  const datasets = require("../lib/diagcalc-datasets");
  for (const dataset of datasets.listDatasets()) {
    for (const suffix of ["name", "description"]) {
      const key = `dataset.${dataset.key}.${suffix}`;
      assert.ok(i18n.translations.en[key], `missing en ${key}`);
      assert.ok(i18n.translations["pt-PT"][key], `missing pt-PT ${key}`);
    }
  }
});
