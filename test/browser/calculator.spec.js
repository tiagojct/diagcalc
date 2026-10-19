const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;
const { pathToFileURL } = require("node:url");
const path = require("node:path");

test.beforeEach(async ({ page }) => {
  await page.route(/https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
});

async function calculate(page, dataset = "ddimer") {
  await page.goto("/");
  await page.selectOption("#datasetSelect", dataset);
  await expect(page.locator("#feedback")).toContainText("Calculation complete");
}

async function submit(page) {
  await page.locator("#inputForm").evaluate((form) => form.requestSubmit());
}

async function openTab(page, name) {
  await page.locator(`#tab-${name}-btn`).click();
}

test("preset editing invalidates results and refreshes identity and ROC seed", async ({ page }) => {
  await calculate(page);
  await expect(page.locator("#resultsHeadline")).toBeFocused();
  await expect(page.locator("#teachingSource")).toContainText("Illustrative teaching counts");
  await page.fill("#tp", "100");
  await expect(page.locator("#resultsHeadline")).toBeEmpty();
  await expect(page.locator("#feedback")).toContainText("Inputs changed");
  await expect(page.locator("#appCaseStrip")).toContainText("Customised");
  await submit(page);
  await openTab(page, "explore");
  await page.locator("#rocPanel summary").click();
  await expect(page.locator("#rocRows input[data-field=tp]").first()).toHaveValue("100");
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem("diagcalc-history"))[0]);
  expect(entry.modified).toBe(true);
  expect(entry.datasetKey).toBe("ddimer");
});

test("history restores correction settings and keeps modes as distinct snapshots", async ({ page }) => {
  await calculate(page);
  await page.locator("#inputForm details summary").click();
  await page.selectOption("#continuityModeSelect", "always");
  await page.selectOption("#continuityModeSelect", "never");
  await openTab(page, "history");
  await expect(page.locator(".history-item")).toHaveCount(3);
  await page.locator(".history-item").nth(1).getByRole("button", { name: "Reload" }).click();
  await expect(page.locator("#continuityModeSelect")).toHaveValue("always");
  await page.reload();
  await expect(page.locator("#continuityModeSelect")).toHaveValue("always");
});

test("malformed and injected history cannot crash or inject HTML", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await calculate(page);
  await page.evaluate(() => {
    const entry = JSON.parse(localStorage.getItem("diagcalc-history"))[0];
    entry.label = "<img src=x onerror='window.injected=true'>";
    entry.datasetKey = null;
    localStorage.setItem("diagcalc-history", JSON.stringify([null, {}, entry]));
  });
  await page.reload();
  await openTab(page, "history");
  await expect(page.locator(".history-item")).toHaveCount(1);
  await expect(page.locator(".history-item-title")).toContainText("<img");
  await expect(page.locator("#historyList img")).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(errors).toEqual([]);
});

test("blocked storage getter preserves calculations and session history", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", { get() { throw new DOMException("blocked", "SecurityError"); } });
  });
  await calculate(page);
  await page.locator("#themeToggle").click();
  await openTab(page, "history");
  await expect(page.locator(".history-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("ROC redraws on theme changes and canvas backing dimensions follow mobile resize", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#rocPanel summary").click();
  const bitmap = await page.locator("#rocCanvas").evaluate((canvas) => canvas.toDataURL());
  await page.locator("#themeToggle").click();
  await expect.poll(() => page.locator("#rocCanvas").evaluate((canvas) => canvas.toDataURL())).not.toBe(bitmap);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.locator("#faganCanvas").evaluate((canvas) =>
    Math.abs(canvas.width - Math.round(canvas.clientWidth * devicePixelRatio)))).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test("edited simulated rows retain their origin and persistent AUC qualification", async ({ page }) => {
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#rocPanel summary").click();
  await page.locator("#rocFillSynthetic").click();
  await expect(page.locator("#rocReadout")).toContainText("Illustrative AUC");
  const row = page.locator("#rocRows tr.roc-row--synthetic").first();
  const tp = row.locator("input[data-field=tp]");
  await tp.fill(await tp.inputValue());
  await expect(row).toHaveAttribute("data-provenance", "edited-simulated");
  await expect(page.locator("#rocReadout")).toContainText("not empirical estimates");
  await page.locator("#rocFillSynthetic").click();
  await expect(page.locator("#rocRows tr.roc-row--synthetic")).toHaveCount(7);
});

test("ROC row errors are explicit rather than silently dropped", async ({ page }) => {
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#rocPanel summary").click();
  await page.locator("#rocRows tr").nth(1).locator("input[data-field=tp]").fill("10");
  await expect(page.locator("#rocReadout")).toContainText("Row 2:");
});

test("changing locale updates existing numeric cards without saving a new calculation", async ({ page }) => {
  await calculate(page);
  const before = await page.evaluate(() => localStorage.getItem("diagcalc-history"));
  const numbers = await page.locator("#resultsHeadline .result-value").allTextContents();
  await page.selectOption("#languageSelect", "pt-PT");
  await expect(page.locator("#resultsHeadline h3").first()).toHaveText("Sensibilidade");
  expect(await page.locator("#resultsHeadline .result-value").allTextContents()).toEqual(numbers);
  expect(await page.evaluate(() => localStorage.getItem("diagcalc-history"))).toBe(before);
});

test("keyboard calculation, validation and reset preserve accessible feedback", async ({ page }) => {
  await calculate(page);
  await page.fill("#preTestProb", "20garbage");
  await submit(page);
  await expect(page.locator("#feedback")).toContainText("valid pre-test probability");
  await expect(page.locator("#resultsHeadline")).toBeEmpty();
  await page.getByRole("button", { name: "Clear fields" }).click();
  await expect(page.locator("#tp")).toHaveValue("");
  await expect(page.locator("#datasetSelect")).toBeFocused();
  await expect(page.locator("#feedback")).toHaveAttribute("aria-live", "polite");
});

test("calculated desktop and mobile views have no serious accessibility violations", async ({ page }) => {
  await calculate(page);
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    const serious = result.violations.filter((issue) => ["serious", "critical"].includes(issue.impact));
    expect(serious.map((issue) => ({ id: issue.id, nodes: issue.nodes.map((node) => node.target) }))).toEqual([]);
  }
});

test("direct file loading remains functional without a server or build step", async ({ page }) => {
  const site = process.env.DIAGCALC_SITE_ROOT || path.join(__dirname, "../../public");
  await page.goto(pathToFileURL(path.join(site, "index.html")).href);
  await page.selectOption("#datasetSelect", "ddimer");
  await expect(page.locator("#resultsHeadline .result-value")).toHaveCount(4);
});


test("storage quota errors retain session history and preferences", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); };
  });
  await calculate(page);
  await page.locator("#themeToggle").click();
  await openTab(page, "history");
  await expect(page.locator(".history-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});


test("clearing a preset tears down derived panels and stale chained state", async ({ page }) => {
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#thresholdPanel summary").click();
  await page.evaluate(() => {
    const select = document.querySelector("#datasetSelect");
    select.value = "";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await openTab(page, "explore");

  for (const id of ["faganNomogram", "prevalenceExplorer", "sequentialTest", "thresholdPanel", "thresholdDemo"]) {
    await expect(page.locator(`#${id}`)).toHaveCSS("display", "none");
  }
  await expect(page.locator("#biasWarnings")).not.toHaveClass(/visible/);
  await expect(page.locator("#feedback")).toContainText("Scenario cleared");

  // The chained-test panel must not be able to compute from stale post-tests.
  await page.evaluate(() => {
    document.querySelector("#tp2").value = "10";
    document.querySelector("#sequentialCalc").click();
  });
  await expect(page.locator("#sequentialFeedback")).toHaveText("Calculate test 1 first.");
});

test("ROC reset rows reseeds from the main matrix on the next calculation", async ({ page }) => {
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#rocPanel summary").click();
  await page.locator("#rocReset").click();
  await expect(page.locator("#rocReadout")).toContainText("between one and 500");
  await submit(page);
  await expect(page.locator("#rocRows tr")).toHaveCount(2);
  await expect(page.locator("#rocRows input[data-field=tp]").first()).toHaveValue("195");
  await expect(page.locator("#rocReadout")).not.toContainText("between one and 500");
  await expect(page.locator("#rocReadout .roc-stat")).toHaveCount(3);
});

test("threshold gauge clears stale zones and markers when unavailable", async ({ page }) => {
  await calculate(page);
  await openTab(page, "explore");
  await page.locator("#thresholdPanel summary").click();
  await expect(page.locator("#thresholdMarkerPre")).toBeVisible();
  await openTab(page, "case");
  await page.fill("#tp", "5");
  await page.fill("#fp", "10");
  await page.fill("#fn", "5");
  await page.fill("#tn", "10");
  await submit(page);
  await openTab(page, "explore");
  await page.locator("#thresholdPanel summary").click();
  await expect(page.locator("#thresholdReadout")).toContainText("Thresholds unavailable");
  await expect(page.locator("#thresholdMarkerPre")).toBeHidden();
  await expect(page.locator("#thresholdMarkerPt")).toBeHidden();
  const zones = await page.locator("#thresholdGauge .threshold-zone").evaluateAll((nodes) => nodes.map((node) => node.style.flexBasis));
  expect(zones).toEqual(["", "", ""]);
});

test("a zero pre-test starts the prevalence explorer at the slider minimum", async ({ page }) => {
  await page.goto("/");
  await page.fill("#tp", "10");
  await page.fill("#fp", "1");
  await page.fill("#fn", "1");
  await page.fill("#tn", "10");
  await page.fill("#preTestProb", "0");
  await submit(page);
  await openTab(page, "explore");
  await page.locator("#prevalenceExplorer summary").click();
  await expect(page.locator("#prevalenceSlider")).toHaveValue("0.1");
  await expect(page.locator("#prevalenceValue")).toHaveText("0.1%");
});

test("undefined metrics do not render as zero bars or clinical tiers", async ({ page }) => {
  await page.goto("/");
  await page.fill("#tp", "0");
  await page.fill("#fp", "0");
  await page.fill("#fn", "5");
  await page.fill("#tn", "5");
  await page.fill("#preTestProb", "20");
  await submit(page);

  const lrCard = page.locator("#resultsSecondary .result-card").filter({ hasText: "Positive likelihood ratio" });
  const band = lrCard.locator(".result-band");
  await expect(band).toHaveClass(/result-band--unavailable/);
  await expect(band.locator(".result-band-marker")).toHaveCount(0);
  await expect(band).toHaveAttribute("aria-label", /not available/);

  const postCard = page.locator("#resultsHeadline .result-card").filter({ hasText: "Post-test probability (positive result)" });
  const bar = postCard.locator(".result-bar");
  await expect(bar).toHaveClass(/result-bar--unavailable/);
  await expect(bar.locator(".result-bar-fill")).toHaveCount(0);
  await expect(bar).not.toHaveAttribute("aria-label", /0\.0 percent/);

  const rail = page.locator("#bayesianUpdate .probability-rail");
  await expect(rail).toHaveClass(/probability-rail--unavailable/);
  await expect(rail.locator(".rail-unavailable")).toHaveText("Not defined for this table");
  await expect(rail.locator(".rail-marker--post")).toHaveCount(0);

  // A defined zero LR+ (not 0/0) does get a corrected interval.
  await page.fill("#fp", "5");
  await page.fill("#fn", "10");
  await page.fill("#tn", "10");
  await submit(page);
  const zeroLrCard = page.locator("#resultsSecondary .result-card").filter({ hasText: "Positive likelihood ratio" });
  await expect(zeroLrCard.locator(".result-ci")).toContainText("continuity-corrected");
});

test("a missing shared module reports a friendly failure and prevents native submit", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("**/lib/diagcalc-storage.js", (route) => route.abort());
  await page.goto("/");
  await expect(page.locator("#feedback")).toContainText("Missing: DiagcalcStorage");
  expect(errors).toEqual([]);
  const url = page.url();
  await page.locator("#inputForm").evaluate((form) => form.requestSubmit());
  await page.waitForTimeout(100);
  expect(page.url()).toBe(url);
});

test("printing keeps the Case sheet, hides exploration tools and switches to light", async ({ page }) => {
  await calculate(page);
  await page.locator("#themeToggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await openTab(page, "explore");
  await page.locator("#thresholdDemo summary").click();
  await page.emulateMedia({ media: "print" });
  await expect(page.locator("#tab-case")).toBeVisible();
  await expect(page.locator("#tab-explore")).toBeHidden();
  await expect(page.locator("#thresholdDemo")).toBeHidden();
  await expect(page.locator(".app-bar")).toBeVisible();
  await expect(page.locator(".app-controls")).toBeHidden();
  await expect(page.locator(".tabbar")).toBeHidden();
  await page.emulateMedia({ media: "screen" });

  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("reloading an older history entry moves it to the front without duplicating", async ({ page }) => {
  await calculate(page);
  await page.locator("#inputForm details summary").click();
  await page.selectOption("#continuityModeSelect", "never");
  await openTab(page, "history");
  await expect(page.locator(".history-item")).toHaveCount(2);
  await page.locator(".history-item").nth(1).getByRole("button", { name: "Reload" }).click();
  await expect(page.locator(".history-item")).toHaveCount(2);
  const modes = await page.evaluate(() => JSON.parse(localStorage.getItem("diagcalc-history")).map((entry) => entry.options.continuityCorrection));
  expect(modes).toEqual(["auto", "never"]);
});

test("clear fields restores and persists the default continuity mode", async ({ page }) => {
  await calculate(page);
  await page.locator("#inputForm details summary").click();
  await page.selectOption("#continuityModeSelect", "never");
  await page.getByRole("button", { name: "Clear fields" }).click();
  await expect(page.locator("#continuityModeSelect")).toHaveValue("auto");
  await page.reload();
  await expect(page.locator("#continuityModeSelect")).toHaveValue("auto");
});

test("theme follows the OS until the user chooses and exposes pressed state", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-label", "Switch to dark mode");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-label", "Switch to light mode");

  await page.locator("#themeToggle").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => localStorage.getItem("diagcalc-theme"))).toBe("light");

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.selectOption("#languageSelect", "pt-PT");
  await expect(page.locator("#themeToggle")).toHaveAttribute("aria-label", "Mudar para modo escuro");
  await expect(page.locator("h1")).toHaveCount(1);
});

test("a prototype datasetKey in history cannot break reload", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await calculate(page);
  await page.evaluate(() => {
    const entries = JSON.parse(localStorage.getItem("diagcalc-history"));
    entries[0].datasetKey = "__proto__";
    localStorage.setItem("diagcalc-history", JSON.stringify(entries));
  });
  await page.reload();
  await openTab(page, "history");
  await page.locator(".history-item").first().getByRole("button", { name: "Reload" }).click();
  await expect(page.locator("#resultsHeadline .result-value")).toHaveCount(4);
  expect(errors).toEqual([]);
});

test("the rail toggles positive and negative evidence and rewrites the teaching note", async ({ page }) => {
  await calculate(page);
  const rail = page.locator("#bayesianUpdate .probability-rail");
  await expect(rail).toHaveAttribute("data-result", "positive");
  await expect(rail.locator(".rail-readout-post")).toContainText("69.2%");
  await expect(page.locator("#teachingNote")).toContainText("Positive result");

  await rail.locator('.rail-toggle[data-result="negative"]').click();
  await expect(rail).toHaveAttribute("data-result", "negative");
  await expect(rail.locator('.rail-toggle[data-result="negative"]')).toHaveAttribute("aria-pressed", "true");
  await expect(rail.locator(".rail-readout-post")).toContainText("1.2%");
  await expect(page.locator("#teachingNote")).toContainText("Negative result");
  await expect(page.locator("#teachingNote")).toContainText("pre-test 28.6%");
});

test("tabs support arrow-key navigation, URL state and an empty rail prompt", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("#bayesianUpdate .rail-empty")).toContainText("Load a scenario");
  await page.locator("#tab-case-btn").focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#tab-explore-btn")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-explore")).toBeVisible();
  await expect(page.locator("#tab-case")).toBeHidden();
  expect(await page.evaluate(() => location.hash)).toBe("#explore");
  await page.keyboard.press("End");
  await expect(page.locator("#tab-history-btn")).toHaveAttribute("aria-selected", "true");
  await expect(page.locator("#tab-history")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(page.locator("#tab-case-btn")).toHaveAttribute("aria-selected", "true");
});

test("clearing a preset selector invalidates the previous calculation and source identity", async ({ page }) => {
  await calculate(page);
  await page.selectOption("#datasetSelect", "");
  await expect(page.locator("#resultsHeadline")).toBeEmpty();
  await submit(page);
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem("diagcalc-history"))[0]);
  expect(entry.datasetKey).toBeNull();
});
