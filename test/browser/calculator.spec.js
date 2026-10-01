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

test("preset editing invalidates results and refreshes identity and ROC seed", async ({ page }) => {
  await calculate(page);
  await expect(page.locator("#resultsHeadline")).toBeFocused();
  await expect(page.locator("#dataset-reference")).toContainText("Illustrative teaching counts");
  await page.fill("#tp", "100");
  await expect(page.locator("#resultsHeadline")).toBeEmpty();
  await expect(page.locator("#feedback")).toContainText("Inputs changed");
  await expect(page.locator("#appCaseStrip")).toContainText("Customised");
  await submit(page);
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
  await page.locator("#historyPanel summary").click();
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
    localStorage.setItem("diagcalc-history", JSON.stringify([null, {}, entry]));
  });
  await page.reload();
  await page.locator("#historyPanel summary").click();
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
  await page.locator("#historyPanel summary").click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("ROC redraws on theme changes and canvas backing dimensions follow mobile resize", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1280, height: 900 });
  await calculate(page);
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
  await page.locator("#historyPanel summary").click();
  await expect(page.locator(".history-item")).toHaveCount(1);
  expect(errors).toEqual([]);
});


test("clearing a preset selector invalidates the previous calculation and source identity", async ({ page }) => {
  await calculate(page);
  await page.selectOption("#datasetSelect", "");
  await expect(page.locator("#resultsHeadline")).toBeEmpty();
  await submit(page);
  const entry = await page.evaluate(() => JSON.parse(localStorage.getItem("diagcalc-history"))[0]);
  expect(entry.datasetKey).toBeNull();
});
