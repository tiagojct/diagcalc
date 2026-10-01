const { test, expect } = require("@playwright/test");
const AxeBuilder = require("@axe-core/playwright").default;

test.beforeEach(async ({ page }) => {
  await page.route(/https?:\/\/(?!127\.0\.0\.1)/, (route) => route.abort());
  await page.goto("/");
  await page.selectOption("#languageSelect", "pt-PT");
  await page.selectOption("#datasetSelect", "ddimer");
});

test("reference sections and matrices stay within their tracks at desktop, tablet and phone widths", async ({ page }) => {
  for (const width of [1920, 1280, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    const geometry = await page.evaluate(() => {
      const sections = Array.from(document.querySelectorAll(".resource-grid > section"), (node) => {
        const { left, right, top, bottom } = node.getBoundingClientRect();
        return { id: node.getAttribute("aria-labelledby"), left, right, top, bottom };
      });
      const overlaps = sections.flatMap((a, index) => sections.slice(index + 1).filter((b) =>
        Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
        Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1).map((b) => [a.id, b.id]));
      const overflowingMatrices = Array.from(document.querySelectorAll(".grid-container")).filter((node) => {
        const rect = node.getBoundingClientRect();
        if (!rect.width) return false;
        return Array.from(node.children).some((child) => child.getBoundingClientRect().right > rect.right + 1);
      }).length;
      return { overlaps, overflowingMatrices, pageOverflows: document.documentElement.scrollWidth > innerWidth };
    });
    expect(geometry, `viewport ${width}`).toEqual({ overlaps: [], overflowingMatrices: 0, pageOverflows: false });
  }
});

test("Portuguese reference content, controls and accessible names translate completely", async ({ page }) => {
  await expect(page.locator("#kappa-title")).toContainText("avaliadores");
  await expect(page.locator("#interpretation-title")).toContainText("interpretação");
  await expect(page.locator("#references-title")).toContainText("referências");
  const prose = await page.locator(".resource-grid").innerText();
  for (const untranslated of ["Companion tool", "Critical appraisal", "Inter-rater", "Rater 1", "Supporting literature", "Online resources", "Reference standard", "Sensitivity and specificity"]) {
    expect(prose).not.toContain(untranslated);
  }
  for (const id of ["tp", "fp", "fn", "tn", "kappaBothPos", "kappaOnly1Pos"]) {
    expect(await page.locator(`#${id}`).getAttribute("aria-label")).not.toMatch(/positive|negative|rater|disease/i);
  }
  await page.fill("#kappaBothPos", "90");
  await page.fill("#kappaOnly1Pos", "5");
  await page.fill("#kappaOnly2Pos", "3");
  await page.fill("#kappaBothNeg", "2");
  await page.locator("#kappaCalc").click();
  const result = await page.locator("#kappaResult").innerText();
  expect(result).not.toMatch(/Observed agreement|Expected agreement|Interpretation|Sample size/);
  await page.selectOption("#languageSelect", "en");
  await expect(page.locator("#interpretation-title")).toHaveText("Interpretation guide");
  await page.selectOption("#languageSelect", "pt-PT");
  await expect(page.locator("#interpretation-title")).toContainText("interpretação");
});

test("Portuguese output and form errors refresh without changing the calculation", async ({ page }) => {
  const before = await page.locator("#resultsHeadline .result-value").allTextContents();
  await expect(page.locator("#bayesianUpdate")).not.toContainText("Positive test");
  await expect(page.locator("#biasWarnings")).not.toContainText("Illustrative teaching");
  await expect(page.locator("#dataset-reference")).not.toContainText("background reading");
  await page.fill("#preTestProb", "invalid");
  await page.locator("#inputForm").evaluate((form) => form.requestSubmit());
  await expect(page.locator("#feedback")).not.toContainText("Enter a valid");
  await page.fill("#preTestProb", "28,6");
  await page.locator("#inputForm").evaluate((form) => form.requestSubmit());
  expect(await page.locator("#resultsHeadline .result-value").allTextContents()).toEqual(before);
});

test("light and dark Portuguese screens retain accessible contrast and semantics", async ({ page }) => {
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const theme of ["light", "dark"]) {
      await page.locator("html").evaluate((node, value) => node.setAttribute("data-theme", value), theme);
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      expect(result.violations.filter((issue) => ["serious", "critical"].includes(issue.impact))
        .map((issue) => ({ id: issue.id, nodes: issue.nodes.map((node) => node.target) })), `${theme}, ${width}`).toEqual([]);
    }
  }
});
