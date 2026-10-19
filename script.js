let preferences = null;

document.addEventListener("DOMContentLoaded", () => {
  const modules = {
    DiagcalcCore: window.DiagcalcCore,
    DiagcalcDatasets: window.DiagcalcDatasets,
    DiagcalcI18n: window.DiagcalcI18n,
    DiagcalcCase: window.DiagcalcCase,
    DiagcalcMeta: window.DiagcalcMeta,
    DiagcalcPresentation: window.DiagcalcPresentation,
    DiagcalcGeometry: window.DiagcalcGeometry,
    DiagcalcStorage: window.DiagcalcStorage,
    DiagcalcCharts: window.DiagcalcCharts,
    DiagcalcRail: window.DiagcalcRail,
  };
  const missing = Object.entries(modules).filter(([, value]) => !value).map(([name]) => name);
  const form = document.getElementById("inputForm");
  const feedbackEl = document.getElementById("feedback");

  if (missing.length) {
    // Keep the form from performing a native navigation when calculation
    // dependencies are unavailable.
    if (form) form.addEventListener("submit", (event) => event.preventDefault());
    console.error(`DIAGCALC: required script(s) failed to load: ${missing.join(", ")}.`);
    if (feedbackEl) {
      const detail = `Missing: ${missing.join(", ")}.`;
      feedbackEl.textContent = modules.DiagcalcI18n
        ? `${modules.DiagcalcI18n.t("feedback.load.failed")} ${detail}`
        : `Calculator failed to load. ${detail}`;
      feedbackEl.classList.add("error");
    }
    return;
  }

  const core = modules.DiagcalcCore;
  const datasetStore = modules.DiagcalcDatasets;
  const i18n = modules.DiagcalcI18n;
  const caseStore = modules.DiagcalcCase;
  preferences = modules.DiagcalcStorage.createStorage(() => window.localStorage);
  const scheduler = modules.DiagcalcCharts.createScheduler();
  let activeSnapshot = null;
  let refreshLocaleResults = () => {};

  function uiText(source) {
    return i18n.text(source);
  }

  function tr(key, vars) {
    return i18n.t(key, vars);
  }

  function createCloseIcon() {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("aria-hidden", "true");
    svg.setAttribute("focusable", "false");
    svg.classList.add("icon-close");
    for (const [x1, y1, x2, y2] of [[6, 6, 18, 18], [18, 6, 6, 18]]) {
      const line = document.createElementNS(ns, "line");
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(x2));
      line.setAttribute("y2", String(y2));
      svg.appendChild(line);
    }
    return svg;
  }

  // ── Case strip in the app bar ────────────────────────────────────────────
  // Tracks what to show next to the DIAGCALC brand. Re-rendered whenever the
  // locale changes so the "No case yet" / "Case:" prefixes stay translated.
  const appCaseStrip = document.getElementById("appCaseStrip");
  const caseState = { kind: "empty", label: "", datasetKey: null, modified: false };
  function renderCaseStrip() {
    if (!appCaseStrip) return;
    if (caseState.kind === "empty") {
      appCaseStrip.textContent = tr("app.case.empty");
      appCaseStrip.classList.remove("has-case");
      return;
    }
    const name = caseState.kind === "adhoc" ? tr("app.case.adhoc") : caseState.datasetKey
      ? (caseState.modified ? tr("case.modified", { name: tr("dataset." + caseState.datasetKey + ".name") }) : tr("dataset." + caseState.datasetKey + ".name"))
      : i18n.relocalise(caseState.label);
    appCaseStrip.textContent = `${tr("app.case.prefix")} ${name}`;
    appCaseStrip.classList.add("has-case");
  }
  function setCase(kind, label) {
    caseState.kind = kind;
    caseState.label = label || "";
    renderCaseStrip();
  }

  // Initialise i18n: detect and apply the active locale, wire up the picker.
  function applyLocale(locale) {
    if (!i18n) return;
    i18n.setLocale(locale);
    i18n.applyToDom();
    document.documentElement.lang = locale.split("-")[0] || "en";
    renderCaseStrip();
    updateThemeIcon(document.documentElement.getAttribute("data-theme"));
    refreshLocaleResults();
  }
  if (i18n) {
    applyLocale(i18n.detectLocale());
    const langSelect = document.getElementById("languageSelect");
    if (langSelect) {
      langSelect.value = i18n.getLocale();
      langSelect.addEventListener("change", () => applyLocale(langSelect.value));
    }
  }

  const resultsHeadlineEl = document.getElementById("resultsHeadline");
  const resultsSecondaryEl = document.getElementById("resultsSecondary");
  const bayesianUpdateEl = document.getElementById("bayesianUpdate");
  const datasetSelect = document.getElementById("datasetSelect");
  const resetButton = document.getElementById("resetButton");
  const biasWarningsEl = document.getElementById("biasWarnings");
  const continuityModeEl = document.getElementById("continuityModeSelect");
  const historyPanelEl = document.getElementById("historyPanel");
  const historyListEl = document.getElementById("historyList");
  const historyCompareEl = document.getElementById("historyCompare");
  const historyClearAllBtn = document.getElementById("historyClearAll");
  const HISTORY_KEY = "diagcalc-history";
  const HISTORY_MAX = 10;
  const historySelected = new Set();

  function currentContinuityMode() {
    return continuityModeEl ? continuityModeEl.value : "auto";
  }

  if (continuityModeEl) {
    const stored = preferences.getItem("diagcalc-continuity");
    if (stored && ["auto", "always", "never"].includes(stored)) {
      continuityModeEl.value = stored;
    }
    continuityModeEl.addEventListener("change", () => {
      preferences.setItem("diagcalc-continuity", continuityModeEl.value);
      if (form && form.querySelector("#tp") && form.querySelector("#tp").value !== "") {
        calculateAndRender();
      }
    });
  }
  const printButton = document.getElementById("printButton");
  const datasetReferenceEl = document.getElementById("dataset-reference");
  const themeToggle = document.getElementById("themeToggle");
  const faganNomogramEl = document.getElementById("faganNomogram");
  const faganCanvas = document.getElementById("faganCanvas");
  const prevalenceExplorerEl = document.getElementById("prevalenceExplorer");
  const prevalenceSliderEl = document.getElementById("prevalenceSlider");
  const prevalenceValueEl = document.getElementById("prevalenceValue");
  const prevalenceReadoutEl = document.getElementById("prevalenceReadout");
  const prevalenceCanvas = document.getElementById("prevalenceCanvas");
  const prevalenceState = { sens: NaN, spec: NaN };
  const sequentialTestEl = document.getElementById("sequentialTest");
  const sequentialFromEl = document.getElementById("sequentialFrom");
  const sequentialPretestEl = document.getElementById("sequentialPretest");
  const sequentialCalcButton = document.getElementById("sequentialCalc");
  const sequentialClearButton = document.getElementById("sequentialClear");
  const sequentialFeedbackEl = document.getElementById("sequentialFeedback");
  const sequentialResultsEl = document.getElementById("sequentialResults");
  const sequentialState = {
    postPositive: NaN,
    postNegative: NaN,
  };
  const thresholdPanelEl = document.getElementById("thresholdPanel");
  const treatmentThresholdInputEl = document.getElementById("treatmentThresholdInput");
  const treatmentThresholdValueEl = document.getElementById("treatmentThresholdValue");
  const thresholdGaugeEl = document.getElementById("thresholdGauge");
  const thresholdMarkerPtEl = document.getElementById("thresholdMarkerPt");
  const thresholdMarkerPreEl = document.getElementById("thresholdMarkerPre");
  const thresholdReadoutEl = document.getElementById("thresholdReadout");
  const thresholdState = { lrPositive: NaN, lrNegative: NaN, preTest: NaN };
  const rocPanelEl = document.getElementById("rocPanel");
  const rocRowsEl = document.getElementById("rocRows");
  const rocAddRowButton = document.getElementById("rocAddRow");
  const rocFillSyntheticButton = document.getElementById("rocFillSynthetic");
  const rocResetButton = document.getElementById("rocReset");
  const rocCanvas = document.getElementById("rocCanvas");
  const rocReadoutEl = document.getElementById("rocReadout");
  const teachingNoteEl = document.getElementById("teachingNote");
  const teachingSourceEl = document.getElementById("teachingSource");
  const historyEmptyEl = document.getElementById("historyEmpty");
  const tabButtons = Array.from(document.querySelectorAll("[role='tab']"));
  const tabPanels = Array.from(document.querySelectorAll("[role='tabpanel']"));
  let lastMetrics = null;
  let lastInput = null;
  let lastDataset = null;

  function switchTab(name, focusTab = false) {
    const button = tabButtons.find((item) => item.dataset.tab === name) || tabButtons[0];
    if (!button) return;
    const selectedName = button.dataset.tab;
    for (const item of tabButtons) {
      const selected = item === button;
      item.setAttribute("aria-selected", String(selected));
      item.tabIndex = selected ? 0 : -1;
    }
    for (const panel of tabPanels) {
      panel.hidden = panel.id !== `tab-${selectedName}`;
    }
    try {
      window.history.replaceState(null, "", `#${selectedName}`);
    } catch (_) {}
    if (focusTab) button.focus();
    scheduler.schedule();
  }

  for (const button of tabButtons) {
    button.addEventListener("click", () => switchTab(button.dataset.tab));
  }
  const tabbar = document.querySelector(".tabbar");
  if (tabbar) {
    tabbar.addEventListener("keydown", (event) => {
      const index = tabButtons.indexOf(document.activeElement);
      if (index < 0) return;
      let next = index;
      if (event.key === "ArrowRight") next = (index + 1) % tabButtons.length;
      else if (event.key === "ArrowLeft") next = (index - 1 + tabButtons.length) % tabButtons.length;
      else if (event.key === "Home") next = 0;
      else if (event.key === "End") next = tabButtons.length - 1;
      else return;
      event.preventDefault();
      switchTab(tabButtons[next].dataset.tab, true);
    });
  }
  window.addEventListener("hashchange", () => {
    const name = window.location.hash.slice(1);
    if (tabButtons.some((item) => item.dataset.tab === name)) switchTab(name);
  });
  const initialTab = window.location.hash.slice(1);
  switchTab(tabButtons.some((item) => item.dataset.tab === initialTab) ? initialTab : "case");

  function clearTeachingNote() {
    lastMetrics = null;
    lastInput = null;
    lastDataset = null;
    if (teachingNoteEl) teachingNoteEl.textContent = tr("teach.empty");
    if (teachingSourceEl) {
      teachingSourceEl.textContent = "";
      teachingSourceEl.hidden = true;
    }
  }

  function clearRail() {
    if (!bayesianUpdateEl) return;
    const empty = document.createElement("p");
    empty.className = "rail-empty";
    empty.textContent = tr("rail.empty");
    bayesianUpdateEl.replaceChildren(empty);
  }

  function updateTeachingNote(metrics, input, dataset) {
    lastMetrics = metrics;
    lastInput = input;
    lastDataset = dataset;
    if (!teachingNoteEl) return;
    if (!metrics) {
      clearTeachingNote();
      return;
    }
    const result = window.DiagcalcRail ? window.DiagcalcRail.getActiveResult() : "positive";
    const resultLabel = result === "positive" ? tr("rail.positive") : tr("rail.negative");
    const lr = result === "positive" ? metrics.lrPositive.value : metrics.lrNegative.value;
    const post = result === "positive" ? metrics.postTestPositive.value : metrics.postTestNegative.value;
    const lrLabel = result === "positive" ? "LR+" : "LR−";
    const sentence = (!Number.isFinite(lr) || !Number.isFinite(post))
      ? tr("teach.note.undefined", { result: resultLabel })
      : tr("teach.note", {
        result: resultLabel,
        lrLabel,
        lr: core.formatLikelihood(lr),
        pre: core.formatPercentage(metrics.preTestProbability.value),
        post: core.formatPercentage(post),
      });
    const context = tr("teach.context", {
      sens: core.formatPercentage(metrics.sensitivity.value),
      spec: core.formatPercentage(metrics.specificity.value),
    });
    teachingNoteEl.textContent = `${sentence} ${context}`;
    if (teachingSourceEl) {
      teachingSourceEl.textContent = dataset
        ? i18n.text(dataset.provenance.note)
        : tr("teach.source.custom");
      teachingSourceEl.hidden = false;
    }
  }

  if (window.DiagcalcRail) {
    window.DiagcalcRail.setOnChange(() => {
      if (lastMetrics) updateTeachingNote(lastMetrics, lastInput, lastDataset);
    });
  }
  clearTeachingNote();
  clearRail();
  initializeTheme();
  const colorSchemeQuery = window.matchMedia("(prefers-color-scheme: dark)");
  colorSchemeQuery.addEventListener("change", () => {
    const storedTheme = preferences.getItem("diagcalc-theme");
    if (storedTheme === "dark" || storedTheme === "light") return;
    const theme = colorSchemeQuery.matches ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    updateThemeIcon(theme);
    scheduler.schedule();
  });

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      toggleTheme();
      scheduler.schedule();
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  datasetSelect.addEventListener("change", () => {
    const selected = datasetSelect.value;
    const dataset = selected ? datasetStore.getDataset(selected) : null;
    if (!dataset) {
      clearMainResults();
      clearDerivedViews();
      activeSnapshot = null;
      caseState.datasetKey = null;
      caseState.modified = false;
      datasetReferenceEl.style.display = "none";
      setCase("empty");
      setFeedback(tr("feedback.scenario.cleared"), true);
      return;
    }

    caseState.datasetKey = selected;
    caseState.modified = false;
    hideRocPanel();
    applyDataset(dataset);
    displayDatasetReference(dataset);
    setCase("named", dataset.name);
    setFeedback(tr("feedback.scenario.loaded"), true);
    calculateAndRender();
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      clearMainResults();
      datasetSelect.value = "";
      datasetReferenceEl.style.display = "none";
      activeSnapshot = null;
      caseState.datasetKey = null;
      caseState.modified = false;
      setCase("empty");
      setFeedback(tr("feedback.cleared"), true);
      if (continuityModeEl) preferences.setItem("diagcalc-continuity", continuityModeEl.value);
      clearDerivedViews();
    });
  });

  resetButton.addEventListener("click", () => {
    datasetSelect.focus();
  });

  if (printButton) {
    printButton.addEventListener("click", () => {
      window.print();
    });
  }

  // Expand printable <details> before printing so their content lands in the
  // PDF, then restore previous state. Skip panels that should remain hidden
  // on print (handled by the @media print stylesheet anyway).
  const PRINT_SKIP_IDS = new Set([
    "prevalenceExplorer",
    "sequentialTest",
    "thresholdPanel",
    "thresholdDemo",
    "rocPanel",
    "historyPanel",
  ]);
  let printTheme = null;
  window.addEventListener("beforeprint", () => {
    if (printTheme === null) printTheme = document.documentElement.getAttribute("data-theme");
    if (printTheme === "dark") document.documentElement.setAttribute("data-theme", "light");
    document.querySelectorAll("details").forEach((d) => {
      if (PRINT_SKIP_IDS.has(d.id)) return;
      d.dataset.printPrevOpen = d.open ? "1" : "0";
      d.open = true;
    });
    // Canvas colours are captured at draw time, so a CSS-only print theme
    // would leave dark-theme pixels on white paper. Redraw synchronously.
    redrawFaganNomogram();
  });
  window.addEventListener("afterprint", () => {
    if (printTheme) document.documentElement.setAttribute("data-theme", printTheme);
    printTheme = null;
    document.querySelectorAll("details").forEach((d) => {
      if (!("printPrevOpen" in d.dataset)) return;
      d.open = d.dataset.printPrevOpen === "1";
      delete d.dataset.printPrevOpen;
    });
    redrawFaganNomogram();
  });

  function readFormValues() {
    const preTestField = document.getElementById("preTestProb");

    return {
      tp: core.safeParseInt(document.getElementById("tp").value),
      fp: core.safeParseInt(document.getElementById("fp").value),
      fn: core.safeParseInt(document.getElementById("fn").value),
      tn: core.safeParseInt(document.getElementById("tn").value),
      preTestProb: core.parseProbability(preTestField.value),
    };
  }

  function calculateAndRender() {
    const data = readFormValues();
    const validation = core.validateInputs(data);

    if (!validation.valid) {
      activeSnapshot = null;
      clearMainResults();
      setFeedback(i18n.message(validation.message), false);
      clearDerivedViews();
      return;
    }

    const metrics = core.calculateMetrics(data, { continuityCorrection: currentContinuityMode(), locale: i18n ? i18n.getLocale() : "en" });
    const currentDataset = caseState.datasetKey ? datasetStore.getDataset(caseState.datasetKey) : null;
    activeSnapshot = caseStore.createSnapshot(data, { continuityCorrection: currentContinuityMode() }, {
      label: caseState.label || uiText("Custom case"), datasetKey: currentDataset ? caseState.datasetKey : null,
      modified: caseState.modified, provenance: currentDataset ? currentDataset.provenance : null,
    });
    if (caseState.kind === "empty") {
      setCase("adhoc");
    }
    renderBiasWarnings([...core.buildBiasWarnings(data), ...datasetStore.buildDatasetWarnings(currentDataset)]);
    renderHeadline(resultsHeadlineEl, metrics);
    renderSecondary(resultsSecondaryEl, metrics);
    renderBayesianUpdate(bayesianUpdateEl, metrics);
    updateTeachingNote(metrics, data, currentDataset);
    renderFaganNomogram(faganCanvas, faganNomogramEl, {
      preTest: metrics.preTestProbability.value,
      lrPositive: metrics.lrPositive.value,
      lrNegative: metrics.lrNegative.value,
      postPositive: metrics.postTestPositive.value,
      postNegative: metrics.postTestNegative.value,
    });
    showPrevalenceExplorer(metrics.sensitivity.value, metrics.specificity.value, metrics.preTestProbability.value);
    showSequentialTest(metrics.postTestPositive.value, metrics.postTestNegative.value);
    showThresholdPanel(metrics.lrPositive.value, metrics.lrNegative.value, metrics.preTestProbability.value);
    showThresholdDemo(metrics.sensitivity.value, metrics.specificity.value, metrics.preTestProbability.value);
    showRocPanel(data);
    saveToHistory(data, metrics);
    renderHistory();
    scheduler.schedule();
    setFeedback(tr("feedback.calc.ok"), true);
    // Move keyboard focus to the headline strip so screen-reader users land
    // on the result and sighted keyboard users don't have to tab back from
    // the submit button. The container has tabindex="-1" so it's
    // programmatically focusable but stays out of the tab order.
    if (resultsHeadlineEl) {
      resultsHeadlineEl.focus({ preventScroll: false });
    }
  }

  // ── Calculation history ──────────────────────────────────────────────────

  function readHistory() {
    return caseStore.parseHistory(preferences.getItem(HISTORY_KEY), HISTORY_MAX)
      .map((entry) => ({ ...entry, summary: caseStore.summary(entry) }));
  }

  function writeHistory(entries) {
    preferences.setItem(HISTORY_KEY, JSON.stringify(entries));
  }

  function saveToHistory() {
    if (!activeSnapshot) return;
    const entries = readHistory();
    const fingerprint = caseStore.fingerprint(activeSnapshot);
    const existingIndex = entries.findIndex((entry) => caseStore.fingerprint(entry) === fingerprint);
    if (existingIndex === 0) return;
    const remaining = existingIndex >= 0 ? entries.filter((_, index) => index !== existingIndex) : entries;
    remaining.unshift(activeSnapshot);
    writeHistory(remaining.slice(0, HISTORY_MAX));
  }

  function historyLabel(entry) {
    const dataset = entry.datasetKey ? datasetStore.getDataset(entry.datasetKey) : null;
    if (dataset) {
      const name = tr("dataset." + entry.datasetKey + ".name");
      return entry.modified ? tr("case.modified", { name }) : name;
    }
    return i18n.relocalise(entry.label);
  }

  function renderHistory() {
    if (!historyPanelEl || !historyListEl) return;
    const entries = readHistory();
    const liveIds = new Set(entries.map((entry) => entry.id));
    for (const id of historySelected) if (!liveIds.has(id)) historySelected.delete(id);
    if (entries.length === 0) {
      historyPanelEl.style.display = "none";
      historyPanelEl.open = false;
      if (historyEmptyEl) historyEmptyEl.hidden = false;
      if (historyCompareEl) historyCompareEl.replaceChildren();
      return;
    }
    if (historyEmptyEl) historyEmptyEl.hidden = true;
    historyPanelEl.style.display = "block";
    historyPanelEl.open = true;
    historyListEl.innerHTML = "";
    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "history-item";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `history-select-${entry.id}`;
      checkbox.checked = historySelected.has(entry.id);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) historySelected.add(entry.id);
        else historySelected.delete(entry.id);
        renderCompare();
      });

      const labelEl = document.createElement("label");
      labelEl.htmlFor = checkbox.id;
      labelEl.className = "history-item-label";
      const ts = new Date(entry.savedAt).toLocaleString(i18n.getLocale());
      const fields = [
        ["history-item-title", historyLabel(entry)],
        ["history-item-meta", tr("history.matrix", { ...entry.input, pre: entry.input.preTestProb })],
        ["history-item-stats", tr("history.stats", { sens: core.formatPercentage(entry.summary.sensitivity), spec: core.formatPercentage(entry.summary.specificity), pos: core.formatPercentage(entry.summary.postTestPositive), neg: core.formatPercentage(entry.summary.postTestNegative) })],
        ["history-item-date", `${ts} · v${entry.engineVersion} · ${uiText(entry.options.continuityCorrection)}${entry.legacy ? " · " + tr("history.legacy") : ""}`],
      ];
      for (const [className, text] of fields) {
        const span = document.createElement("span");
        span.className = className;
        span.textContent = text;
        labelEl.appendChild(span);
      }

      const actions = document.createElement("div");
      actions.className = "history-item-actions";
      const reloadBtn = document.createElement("button");
      reloadBtn.type = "button";
      reloadBtn.className = "secondary";
      reloadBtn.textContent = uiText("Reload");
      reloadBtn.addEventListener("click", () => reloadHistoryEntry(entry));
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "secondary history-item-delete";
      deleteBtn.append(createCloseIcon());
      deleteBtn.title = uiText("Delete this entry");
      deleteBtn.setAttribute("aria-label", uiText("Delete history entry"));
      deleteBtn.addEventListener("click", () => deleteHistoryEntry(entry.id));
      actions.appendChild(reloadBtn);
      actions.appendChild(deleteBtn);

      li.appendChild(checkbox);
      li.appendChild(labelEl);
      li.appendChild(actions);
      historyListEl.appendChild(li);
    }
    renderCompare();
  }

  function deleteHistoryEntry(id) {
    const entries = readHistory().filter((e) => e.id !== id);
    writeHistory(entries);
    historySelected.delete(id);
    renderHistory();
  }

  function reloadHistoryEntry(entry) {
    document.getElementById("tp").value = entry.input.tp;
    document.getElementById("fp").value = entry.input.fp;
    document.getElementById("fn").value = entry.input.fn;
    document.getElementById("tn").value = entry.input.tn;
    document.getElementById("preTestProb").value = entry.input.preTestProb;
    if (continuityModeEl) continuityModeEl.value = entry.options.continuityCorrection;
    preferences.setItem("diagcalc-continuity", entry.options.continuityCorrection);
    const entryDataset = entry.datasetKey ? datasetStore.getDataset(entry.datasetKey) : null;
    caseState.datasetKey = entryDataset ? entry.datasetKey : null;
    caseState.modified = entry.modified;
    hideRocPanel();
    if (datasetSelect && entryDataset && !entry.modified) {
      datasetSelect.value = entry.datasetKey;
      displayDatasetReference(entryDataset);
      setCase("named", entryDataset.name);
    } else if (datasetSelect) {
      datasetSelect.value = "";
      if (entryDataset) displayDatasetReference(entryDataset);
      else datasetReferenceEl.style.display = "none";
      setCase("named", entry.label);
    }
    setFeedback(tr("feedback.history.reloaded", { label: historyLabel(entry) }), true);
    switchTab("case");
    calculateAndRender();
    if (entry.legacy || entry.engineVersion !== window.DiagcalcMeta.version) {
      setFeedback(uiText("Case recalculated with the current engine. Legacy history used auto because its original settings were not recorded."), true);
    }
  }

  function renderCompare() {
    if (!historyCompareEl) return;
    historyCompareEl.innerHTML = "";
    if (historySelected.size < 2) return;
    const entries = readHistory().filter((e) => historySelected.has(e.id));
    if (entries.length < 2) return;

    const table = document.createElement("table");
    table.className = "history-compare-table";
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headerRow.appendChild(document.createElement("th"));
    for (const e of entries) {
      const th = document.createElement("th");
      th.scope = "col";
      th.textContent = historyLabel(e);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const rows = [
      [uiText("TP/FP/FN/TN"), (e) => `${e.input.tp} / ${e.input.fp} / ${e.input.fn} / ${e.input.tn}`],
      [uiText("Pre-test"), (e) => `${e.input.preTestProb}%`],
      [uiText("Engine / continuity"), (e) => `${e.engineVersion} / ${uiText(e.options.continuityCorrection)}`],
      [uiText("Sensitivity"), (e) => core.formatPercentage(e.summary.sensitivity)],
      [uiText("Specificity"), (e) => core.formatPercentage(e.summary.specificity)],
      [uiText("PPV"), (e) => core.formatPercentage(e.summary.ppv)],
      [uiText("NPV"), (e) => core.formatPercentage(e.summary.npv)],
      ["LR+", (e) => core.formatLikelihood(e.summary.lrPositive)],
      ["LR−", (e) => core.formatLikelihood(e.summary.lrNegative)],
      [uiText("Post-test (+)"), (e) => core.formatPercentage(e.summary.postTestPositive)],
      [uiText("Post-test (−)"), (e) => core.formatPercentage(e.summary.postTestNegative)],
    ];
    for (const [label, fn] of rows) {
      const tr = document.createElement("tr");
      const th = document.createElement("th");
      th.scope = "row";
      th.textContent = label;
      tr.appendChild(th);
      for (const e of entries) {
        const td = document.createElement("td");
        td.textContent = fn(e);
        tr.appendChild(td);
      }
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    historyCompareEl.appendChild(table);
  }

  if (historyClearAllBtn) {
    historyClearAllBtn.addEventListener("click", () => {
      if (!confirm(uiText("Clear all saved history? This cannot be undone."))) return;
      writeHistory([]);
      historySelected.clear();
      renderHistory();
    });
  }

  renderHistory();

  function showRocPanel(firstRow) {
    if (!rocPanelEl) return;
    rocPanelEl.style.display = "block";
    // Seed from the main matrix whenever no row carries an entered value.
    // Reset rows leaves one blank row behind, so counting children alone
    // would leave the panel stuck on a validation error after recalculation.
    const hasEnteredRow = Array.from(rocRowsEl.querySelectorAll("input"))
      .some((input) => input.value.trim() !== "");
    if (!hasEnteredRow) {
      rocRowsEl.innerHTML = "";
      addRocRow({ cutoff: "", tp: firstRow.tp, fp: firstRow.fp, fn: firstRow.fn, tn: firstRow.tn });
      addRocRow();
    }
    recomputeRoc();
  }

  function hideRocPanel() {
    if (!rocPanelEl) return;
    rocPanelEl.style.display = "none";
    rocPanelEl.open = false;
    rocRowsEl.innerHTML = "";
    if (rocCanvas) {
      const ctx = rocCanvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, rocCanvas.width, rocCanvas.height);
      }
    }
    if (rocReadoutEl) rocReadoutEl.innerHTML = "";
  }

  function addRocRow(prefill, opts) {
    const rowEl = document.createElement("tr");
    rowEl.dataset.provenance = opts && opts.synthetic ? "simulated" : "observed";
    if (opts && opts.synthetic) {
      rowEl.classList.add("roc-row--synthetic");
      rowEl.title = uiText("Synthetic cutoff — generated from a binormal fit of the first row.");
    }
    const fields = ["cutoff", "tp", "fp", "fn", "tn"];
    for (const field of fields) {
      const td = document.createElement("td");
      const input = document.createElement("input");
      input.type = "number";
      input.inputMode = field === "cutoff" ? "decimal" : "numeric";
      input.step = field === "cutoff" ? "any" : "1";
      if (field !== "cutoff") input.min = "0";
      input.dataset.field = field;
      if (prefill && prefill[field] !== undefined && prefill[field] !== "") {
        input.value = prefill[field];
      }
      input.addEventListener("input", () => {
        if (rowEl.dataset.provenance !== "observed") {
          rowEl.dataset.provenance = "edited-simulated";
          rowEl.title = uiText("Edited simulated cutoff — still derived from a binormal model.");
        }
        recomputeRoc();
      });
      input.setAttribute("aria-label", tr("roc.rowAria", { field: field === "cutoff" ? uiText("Cutoff") : uiText(field.toUpperCase()) }));
      td.appendChild(input);
      rowEl.appendChild(td);
    }
    const removeTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "roc-remove";
    removeBtn.append(createCloseIcon());
    removeBtn.setAttribute("aria-label", uiText("Remove this cutoff row"));
    removeBtn.addEventListener("click", () => {
      rowEl.remove();
      recomputeRoc();
    });
    removeTd.appendChild(removeBtn);
    rowEl.appendChild(removeTd);
    rocRowsEl.appendChild(rowEl);
  }

  function readRocRows() {
    return Array.from(rocRowsEl.children).filter((tr) =>
      Array.from(tr.querySelectorAll("input")).some((input) => input.value.trim() !== "")
    ).map((tr) => {
      const obj = { provenance: tr.dataset.provenance };
      for (const input of tr.querySelectorAll("input")) {
        const f = input.dataset.field;
        if (f === "cutoff") {
          const v = parseFloat(input.value);
          obj.cutoff = Number.isFinite(v) ? v : input.value || null;
        } else {
          obj[f] = core.safeParseInt(input.value);
        }
      }
      return obj;
    });
  }

  function recomputeRoc() {
    if (!rocReadoutEl) return;
    const rows = readRocRows();
    const direction = document.getElementById("rocDirection").value;
    const validation = core.validateRocRows(rows, { direction });
    if (!validation.valid) {
      rocReadoutEl.textContent = validation.errors.map((error) =>
        `${error.row ? tr("roc.row", { row: error.row }) : ""}${i18n.message(error.message)}`).join(" ");
      window.DiagcalcCharts.clearCanvas(rocCanvas);
      return;
    }
    const roc = core.calculateROC(rows, { direction });
    drawRocCurve(roc);
    renderRocReadout(roc);
  }

  function renderRocReadout(roc) {
    rocReadoutEl.innerHTML = "";
    if (roc.simulated) {
      const warning = document.createElement("p");
      warning.textContent = uiText("Includes simulated or edited simulated cutoffs. AUC and optimum are illustrative, not empirical estimates.");
      rocReadoutEl.appendChild(warning);
    }
    const stats = [
      [roc.simulated ? uiText("Illustrative AUC (includes simulated rows)") : uiText("AUC (trapezoid estimate)"), roc.auc.toFixed(3)],
      [uiText("Cutoffs"), String(roc.points.length)],
      [roc.simulated ? uiText("Illustrative Youden optimum") : uiText("Youden optimum"), roc.optimalPoint
        ? tr("roc.optimum", { cutoff: roc.optimalPoint.cutoff ?? "—", sens: core.formatPercentage(roc.optimalPoint.sens), spec: core.formatPercentage(roc.optimalPoint.spec), j: roc.optimalPoint.youden.toFixed(3) })
        : "—"],
    ];
    for (const [label, value] of stats) {
      const cell = document.createElement("div");
      cell.className = "roc-stat";
      const lab = document.createElement("span");
      lab.className = "roc-stat-label";
      lab.textContent = label;
      const val = document.createElement("span");
      val.className = "roc-stat-value";
      val.textContent = value;
      cell.appendChild(lab);
      cell.appendChild(val);
      rocReadoutEl.appendChild(cell);
    }
  }

  function drawRocCurve(roc) {
    window.DiagcalcCharts.drawROC(rocCanvas, roc);
  }

  document.getElementById("rocDirection").addEventListener("change", recomputeRoc);
  if (rocAddRowButton) {
    rocAddRowButton.addEventListener("click", () => addRocRow());
  }
  if (rocFillSyntheticButton) {
    rocFillSyntheticButton.addEventListener("click", () => {
      // Idempotent: drop any prior synthetic rows so repeated clicks refresh
      // the scaffold instead of accumulating.
      Array.from(rocRowsEl.querySelectorAll("tr.roc-row--synthetic")).forEach((tr) => tr.remove());

      // Seed from the first non-empty (non-synthetic) ROC row; fall back to
      // the main form (where the user just typed TP/FP/FN/TN) so the button
      // works the moment the panel opens, before any rows are populated.
      const rocRows = readRocRows();
      const isValid = (r) =>
        r &&
        Number.isInteger(r.tp) && Number.isInteger(r.fp) &&
        Number.isInteger(r.fn) && Number.isInteger(r.tn) &&
        (r.tp + r.fn > 0) && (r.tn + r.fp > 0);
      let seed = rocRows.find(isValid);
      let seedSource = uiText("ROC row 1");
      if (!seed) {
        const form = readFormValues();
        if (isValid(form)) {
          seed = form;
          seedSource = "main form";
        }
      }
      if (!seed) {
        if (rocReadoutEl) {
          rocReadoutEl.textContent = uiText("Need a valid 2×2 (TP / FP / FN / TN) before synthetic cutoffs can be generated — fill the main form or row 1 first.");
        }
        return;
      }
      document.getElementById("rocDirection").value = "higher";
      const synth = core.generateSyntheticRocPoints(seed, 7);
      if (synth.length === 0) {
        if (rocReadoutEl) {
          rocReadoutEl.textContent = uiText("Could not fit a binormal model to that 2×2 — the synthetic scaffold needs at least one diseased and one non-diseased case.");
        }
        return;
      }
      for (const row of synth) {
        addRocRow(row, { synthetic: true });
      }
      recomputeRoc();
      const firstSynth = rocRowsEl.querySelector("tr.roc-row--synthetic");
      if (firstSynth && firstSynth.scrollIntoView) {
        firstSynth.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
      }
      // Surface that the click did something — the AUC update alone is easy
      // to miss when the scaffold lands on top of an already-populated curve.
      // Prepended *after* recomputeRoc to survive its innerHTML reset.
      if (rocReadoutEl) {
        const flash = document.createElement("p");
        flash.className = "roc-flash";
        flash.textContent = tr("roc.added", { count: synth.length, seed: i18n.relocalise(seedSource) });
        rocReadoutEl.prepend(flash);
        setTimeout(() => { if (flash.isConnected) flash.remove(); }, 5000);
      }
    });
  }
  if (rocResetButton) {
    rocResetButton.addEventListener("click", () => {
      rocRowsEl.innerHTML = "";
      addRocRow();
      recomputeRoc();
    });
  }

  // Cohen's κ companion tool — independent of the main diagnostic test workflow.
  const kappaCalcButton = document.getElementById("kappaCalc");
  const kappaClearButton = document.getElementById("kappaClear");
  const kappaResultEl = document.getElementById("kappaResult");
  const kappaFields = ["kappaBothPos", "kappaOnly1Pos", "kappaOnly2Pos", "kappaBothNeg"];

  if (kappaCalcButton) {
    kappaCalcButton.addEventListener("click", computeKappa);
  }
  if (kappaClearButton) {
    kappaClearButton.addEventListener("click", () => {
      for (const id of kappaFields) {
        const el = document.getElementById(id);
        if (el) el.value = "";
      }
      if (kappaResultEl) kappaResultEl.innerHTML = "";
    });
  }
  for (const id of kappaFields) {
    const el = document.getElementById(id);
    if (el) el.addEventListener("keydown", (e) => { if (e.key === "Enter") computeKappa(); });
  }

  function computeKappa() {
    if (!kappaResultEl) return;
    const inputs = {
      bothPos: core.safeParseInt(document.getElementById("kappaBothPos").value),
      only1Pos: core.safeParseInt(document.getElementById("kappaOnly1Pos").value),
      only2Pos: core.safeParseInt(document.getElementById("kappaOnly2Pos").value),
      bothNeg: core.safeParseInt(document.getElementById("kappaBothNeg").value),
    };
    if (Object.values(inputs).some((v) => !Number.isInteger(v) || v < 0)) {
      kappaResultEl.innerHTML = `<p class="kappa-error">${uiText("Enter non-negative integers in all four cells.")}</p>`;
      return;
    }
    const result = core.calcCohenKappa(inputs);
    if (!result) {
      kappaResultEl.innerHTML = `<p class="kappa-error">${uiText("Total cannot be zero.")}</p>`;
      return;
    }
    kappaResultEl.innerHTML = "";
    const stats = [
      ["κ", Number.isFinite(result.value) ? result.value.toFixed(3) : "—"],
      [uiText("95% CI"), result.ci ? `${result.ci.lower.toFixed(3)} – ${result.ci.upper.toFixed(3)}` : "—"],
      [uiText("Observed agreement (p_o)"), core.formatPercentage(result.observed)],
      [uiText("Expected agreement (p_e)"), core.formatPercentage(result.expected)],
      ["N", String(result.n)],
      [uiText("Interpretation"), window.DiagcalcPresentation.noteFor("interpretKappa", result.value, i18n.getLocale())],
    ];
    for (const [label, value] of stats) {
      const cell = document.createElement("div");
      cell.className = "kappa-stat";
      const lab = document.createElement("span");
      lab.className = "kappa-stat-label";
      lab.textContent = label;
      const val = document.createElement("span");
      val.className = "kappa-stat-value";
      val.textContent = value;
      cell.appendChild(lab);
      cell.appendChild(val);
      kappaResultEl.appendChild(cell);
    }
  }

  function clearMainResults() {
    if (resultsHeadlineEl) resultsHeadlineEl.innerHTML = "";
    if (resultsSecondaryEl) resultsSecondaryEl.innerHTML = "";
    if (bayesianUpdateEl) bayesianUpdateEl.innerHTML = "";
  }

  // Tear down every panel that derives from a calculation. Keeping the reset
  // paths in one place prevents stale charts or chained-test state from
  // surviving a cleared or invalid case.
  function clearDerivedViews() {
    clearFaganNomogram(faganNomogramEl, faganCanvas);
    hidePrevalenceExplorer();
    hideSequentialTest();
    hideThresholdPanel();
    hideThresholdDemo();
    hideRocPanel();
    renderBiasWarnings([]);
    clearTeachingNote();
    clearRail();
  }

  function renderBiasWarnings(warnings) {
    if (!biasWarningsEl) return;
    biasWarningsEl.innerHTML = "";
    if (!Array.isArray(warnings) || warnings.length === 0) {
      biasWarningsEl.classList.remove("visible");
      return;
    }
    biasWarningsEl.classList.add("visible");
    const heading = document.createElement("p");
    heading.className = "bias-warnings-heading";
    heading.textContent = uiText("Heads up");
    biasWarningsEl.appendChild(heading);
    const list = document.createElement("ul");
    list.className = "bias-warnings-list";
    for (const msg of warnings) {
      const li = document.createElement("li");
      li.textContent = i18n.message(msg);
      list.appendChild(li);
    }
    biasWarningsEl.appendChild(list);
  }

  function showThresholdPanel(lrPositive, lrNegative, preTest) {
    if (!thresholdPanelEl) return;
    thresholdState.lrPositive = lrPositive;
    thresholdState.lrNegative = lrNegative;
    thresholdState.preTest = preTest;
    thresholdPanelEl.style.display = "block";
    updateThresholdView();
  }

  function resetThresholdGauge() {
    if (thresholdGaugeEl) {
      thresholdGaugeEl.querySelectorAll(".threshold-zone").forEach((zone) => {
        zone.style.flexBasis = "";
      });
    }
    if (thresholdMarkerPtEl) {
      thresholdMarkerPtEl.style.left = "";
      thresholdMarkerPtEl.style.display = "none";
    }
    if (thresholdMarkerPreEl) {
      thresholdMarkerPreEl.style.left = "";
      thresholdMarkerPreEl.style.display = "none";
    }
  }

  function hideThresholdPanel() {
    if (!thresholdPanelEl) return;
    thresholdPanelEl.style.display = "none";
    thresholdPanelEl.open = false;
    thresholdState.lrPositive = NaN;
    thresholdState.lrNegative = NaN;
    thresholdState.preTest = NaN;
    resetThresholdGauge();
  }

  function updateThresholdView() {
    if (!thresholdReadoutEl) return;
    const Ptpercent = parseFloat(treatmentThresholdInputEl.value);
    if (!Number.isFinite(Ptpercent)) return;
    const Pt = Ptpercent / 100;
    treatmentThresholdValueEl.textContent = `${Ptpercent.toFixed(0)}%`;

    const t = core.calculateThresholds({
      treatmentThreshold: Pt,
      lrPositive: thresholdState.lrPositive,
      lrNegative: thresholdState.lrNegative,
    });
    if (!t) {
      resetThresholdGauge();
      thresholdReadoutEl.textContent = uiText("Thresholds unavailable: this display requires LR+ > 1 and 0 ≤ LR− < 1. Review test direction.");
      return;
    }

    const Plow = t.testingThreshold;
    const Phigh = t.testTreatmentThreshold;
    const lowPct = core.clamp(Plow * 100, 0, 100);
    const highPct = core.clamp(Phigh * 100, lowPct, 100);

    const zones = thresholdGaugeEl.querySelectorAll(".threshold-zone");
    if (zones.length === 3) {
      zones[0].style.flexBasis = `${lowPct}%`;
      zones[1].style.flexBasis = `${Math.max(0, highPct - lowPct)}%`;
      zones[2].style.flexBasis = `${Math.max(0, 100 - highPct)}%`;
    }

    thresholdMarkerPtEl.style.left = `${Ptpercent}%`;
    thresholdMarkerPtEl.style.display = "block";
    const prePct = Number.isFinite(thresholdState.preTest) ? thresholdState.preTest * 100 : NaN;
    if (Number.isFinite(prePct)) {
      thresholdMarkerPreEl.style.left = `${core.clamp(prePct, 0, 100)}%`;
      thresholdMarkerPreEl.style.display = "block";
    } else {
      thresholdMarkerPreEl.style.display = "none";
    }

    thresholdReadoutEl.innerHTML = "";
    const stats = [
      [uiText("Testing threshold (don't test below)"), core.formatPercentage(Plow)],
      [uiText("Treatment threshold (Pt)"), core.formatPercentage(Pt)],
      [uiText("Test-treatment threshold (just treat above)"), core.formatPercentage(Phigh)],
      [uiText("Decision at current pre-test"), classifyPreTest(prePct, lowPct, highPct, Ptpercent)],
    ];
    for (const [label, value] of stats) {
      const cell = document.createElement("div");
      cell.className = "threshold-stat";
      const lab = document.createElement("span");
      lab.className = "threshold-stat-label";
      lab.textContent = label;
      const val = document.createElement("span");
      val.className = "threshold-stat-value";
      val.textContent = value;
      cell.appendChild(lab);
      cell.appendChild(val);
      thresholdReadoutEl.appendChild(cell);
    }
  }

  function classifyPreTest(prePct, lowPct, highPct, Ptpct) {
    if (!Number.isFinite(prePct)) return "—";
    if (prePct < lowPct) return uiText("Don't test — even a positive result wouldn't reach Pt.");
    if (prePct > highPct) return uiText("Treat without testing — even a negative result stays above Pt.");
    return tr("threshold.decision", { pt: Ptpct.toFixed(0) });
  }

  if (treatmentThresholdInputEl) {
    treatmentThresholdInputEl.addEventListener("input", updateThresholdView);
  }

  function showSequentialTest(postPositive, postNegative) {
    if (!sequentialTestEl) return;
    sequentialState.postPositive = postPositive;
    sequentialState.postNegative = postNegative;
    sequentialTestEl.style.display = "block";
    updateSequentialPretestLabel();
    setSequentialFeedback("", true);
    sequentialResultsEl.innerHTML = "";
  }

  function hideSequentialTest() {
    if (!sequentialTestEl) return;
    sequentialState.postPositive = NaN;
    sequentialState.postNegative = NaN;
    sequentialTestEl.style.display = "none";
    sequentialTestEl.open = false;
    setSequentialFeedback("", true);
    sequentialResultsEl.innerHTML = "";
    ["tp2", "fp2", "fn2", "tn2"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.value = "";
    });
  }

  function chainedPreTestPercent() {
    const from = sequentialFromEl ? sequentialFromEl.value : "positive";
    const fraction = from === "negative" ? sequentialState.postNegative : sequentialState.postPositive;
    if (!Number.isFinite(fraction)) return NaN;
    return core.chainedPreTestProbability(fraction);
  }

  function updateSequentialPretestLabel() {
    if (!sequentialPretestEl) return;
    const pct = chainedPreTestPercent();
    if (!Number.isFinite(pct)) {
      sequentialPretestEl.textContent = "";
      return;
    }
    const fromLabel = sequentialFromEl && sequentialFromEl.value === "negative" ? "negative" : "positive";
    sequentialPretestEl.textContent = tr("chain.pre", { pre: core.formatPercentage(pct / 100), result: tr("chain.result." + fromLabel) });
  }

  function setSequentialFeedback(message, isSuccess) {
    if (!sequentialFeedbackEl) return;
    sequentialFeedbackEl.textContent = message;
    sequentialFeedbackEl.classList.remove("error", "success");
    if (!message) return;
    sequentialFeedbackEl.classList.add(isSuccess ? "success" : "error");
  }

  function calculateSequentialTest() {
    if (!sequentialResultsEl) return;
    const preTestProb = chainedPreTestPercent();
    if (!Number.isFinite(preTestProb)) {
      setSequentialFeedback(uiText("Calculate test 1 first."), false);
      return;
    }

    const input = {
      tp: core.safeParseInt(document.getElementById("tp2").value),
      fp: core.safeParseInt(document.getElementById("fp2").value),
      fn: core.safeParseInt(document.getElementById("fn2").value),
      tn: core.safeParseInt(document.getElementById("tn2").value),
      preTestProb,
    };
    const validation = core.validateInputs(input);
    if (!validation.valid) {
      sequentialResultsEl.innerHTML = "";
      setSequentialFeedback(i18n.message(validation.message), false);
      return;
    }

    const metrics = core.calculateMetrics(input, { continuityCorrection: currentContinuityMode(), locale: i18n ? i18n.getLocale() : "en" });
    renderResults(sequentialResultsEl, metrics);
    setSequentialFeedback(
      tr("chain.done", { positive: core.formatPercentage(metrics.postTestPositive.value), negative: core.formatPercentage(metrics.postTestNegative.value) }),
      true
    );
  }

  if (sequentialFromEl) {
    sequentialFromEl.addEventListener("change", () => {
      updateSequentialPretestLabel();
      sequentialResultsEl.innerHTML = "";
      setSequentialFeedback("", true);
    });
  }
  if (sequentialCalcButton) {
    sequentialCalcButton.addEventListener("click", calculateSequentialTest);
  }
  if (sequentialClearButton) {
    sequentialClearButton.addEventListener("click", () => {
      ["tp2", "fp2", "fn2", "tn2"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.value = "";
      });
      sequentialResultsEl.innerHTML = "";
      setSequentialFeedback(uiText("Test 2 fields cleared."), true);
    });
  }

  function showPrevalenceExplorer(sens, spec, currentPrev) {
    if (!prevalenceExplorerEl || !Number.isFinite(sens) || !Number.isFinite(spec)) {
      return;
    }
    prevalenceState.sens = sens;
    prevalenceState.spec = spec;
    prevalenceExplorerEl.style.display = "block";
    const currentFraction = Number.isFinite(currentPrev) ? currentPrev : 0.001;
    const startPercent = Math.max(0.1, Math.min(99.9, currentFraction * 100));
    prevalenceSliderEl.value = startPercent.toFixed(1);
    updatePrevalenceReadout(startPercent);
    drawPrevalenceChart(sens, spec, startPercent / 100);
  }

  function hidePrevalenceExplorer() {
    if (!prevalenceExplorerEl) return;
    prevalenceExplorerEl.style.display = "none";
    prevalenceExplorerEl.open = false;
    prevalenceState.sens = NaN;
    prevalenceState.spec = NaN;
  }

  function updatePrevalenceReadout(prevPercent) {
    if (!prevalenceReadoutEl) return;
    const { sens, spec } = prevalenceState;
    if (!Number.isFinite(sens) || !Number.isFinite(spec)) return;
    const prev = prevPercent / 100;
    const ppvDen = sens * prev + (1 - spec) * (1 - prev);
    const npvDen = spec * (1 - prev) + (1 - sens) * prev;
    const ppv = ppvDen > 0 ? (sens * prev) / ppvDen : NaN;
    const npv = npvDen > 0 ? (spec * (1 - prev)) / npvDen : NaN;
    const postPositive = ppv;
    const postNegative = Number.isFinite(npv) ? 1 - npv : NaN;

    prevalenceValueEl.textContent = `${prevPercent.toFixed(1)}%`;
    prevalenceReadoutEl.innerHTML = "";
    const stats = [
      [uiText("PPV"), ppv],
      [uiText("NPV"), npv],
      [uiText("Post-test (+)"), postPositive],
      [uiText("Post-test (−)"), postNegative],
    ];
    for (const [label, value] of stats) {
      const cell = document.createElement("div");
      cell.className = "prevalence-stat";
      const lab = document.createElement("span");
      lab.className = "prevalence-stat-label";
      lab.textContent = label;
      const val = document.createElement("span");
      val.className = "prevalence-stat-value";
      val.textContent = core.formatPercentage(value);
      cell.appendChild(lab);
      cell.appendChild(val);
      prevalenceReadoutEl.appendChild(cell);
    }
  }

  if (prevalenceSliderEl) {
    prevalenceSliderEl.addEventListener("input", () => {
      const prev = parseFloat(prevalenceSliderEl.value);
      if (!Number.isFinite(prev)) return;
      updatePrevalenceReadout(prev);
      drawPrevalenceChart(prevalenceState.sens, prevalenceState.spec, prev / 100);
    });
  }

  function drawPrevalenceChart(sens, spec, currentPrev) {
    window.DiagcalcCharts.drawPrevalence(prevalenceCanvas, sens, spec, currentPrev);
  }

  // ── Threshold explorer demo ──────────────────────────────────────────────
  // Adapted from the ia-saude "Sensibilidade vs especificidade" demo.
  // Generates two Gaussian score distributions (diseased + healthy) with
  // overlap, renders them as a Canvas scatter plot, and lets the user drag
  // a threshold slicer to see how TP/FP/FN/TN and all metrics shift in real
  // time. Uses core.calculateMetrics() so the numbers match the main
  // calculator exactly.
  const thresholdDemoEl = document.getElementById("thresholdDemo");
  const thresholdDemoCanvas = document.getElementById("thresholdDemoCanvas");
  const thresholdDemoSliderEl = document.getElementById("thresholdDemoSlider");
  const thresholdDemoValueEl = document.getElementById("thresholdDemoValue");
  const thresholdDemoNoteEl = document.getElementById("thresholdDemoNote");

  // Seeded LCG so the scatter plot looks the same on every page load.
  function makeSeededRng(seed) {
    let s = seed;
    return () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
  }

  function gaussSeeded(rng, mu, sigma) {
    const u = rng();
    const v = rng();
    return mu + sigma * Math.sqrt(-2 * Math.log(u || 0.0001)) * Math.cos(2 * Math.PI * v);
  }

  // State: the score distributions are regenerated whenever the scenario
  // changes, so the demo reflects the current case's sens/spec/prevalence.
  // We use a binormal model: healthy scores ~ N(0, 1), diseased ~ N(d, 1)
  // where d = Φ⁻¹(sens) + Φ⁻¹(spec) (the binormal separation). Scores are
  // then normalised to [0, 1] via Φ for display.
  let tdDiseasedScores = [];
  let tdHealthyScores = [];
  let tdDiseasedJitter = [];
  let tdHealthyJitter = [];

  function regenerateThresholdDemoData(sens, spec, prevalence) {
    const rng = makeSeededRng(42);
    const N = 200;
    const nDiseased = Math.max(1, Math.min(N - 1, Math.round(N * prevalence)));
    const nHealthy = N - nDiseased;

    const eps = 1 / (2 * N);
    const sClamp = Math.min(1 - eps, Math.max(eps, sens));
    const pClamp = Math.min(1 - eps, Math.max(eps, spec));
    const d = core.invStdNormal(sClamp) + core.invStdNormal(pClamp);

    tdHealthyScores = [];
    for (let i = 0; i < nHealthy; i += 1) {
      const raw = gaussSeeded(rng, 0, 1);
      tdHealthyScores.push(Math.max(0, Math.min(1, core.stdNormalCdf(raw))));
    }
    tdDiseasedScores = [];
    for (let i = 0; i < nDiseased; i += 1) {
      const raw = gaussSeeded(rng, d, 1);
      tdDiseasedScores.push(Math.max(0, Math.min(1, core.stdNormalCdf(raw))));
    }
    tdDiseasedJitter = tdDiseasedScores.map(() => (rng() - 0.5) * 16);
    tdHealthyJitter = tdHealthyScores.map(() => (rng() - 0.5) * 14);
  }

  function showThresholdDemo(sens, spec, prevalence) {
    if (!thresholdDemoEl) return;
    regenerateThresholdDemoData(sens, spec, prevalence);
    thresholdDemoEl.style.display = "block";
    renderThresholdDemo();
  }

  function hideThresholdDemo() {
    if (!thresholdDemoEl) return;
    thresholdDemoEl.style.display = "none";
    thresholdDemoEl.open = false;
    if (thresholdDemoCanvas) {
      const ctx = thresholdDemoCanvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, thresholdDemoCanvas.width, thresholdDemoCanvas.height);
      }
    }
  }

  function renderThresholdDemo() {
    if (!thresholdDemoCanvas || !thresholdDemoSliderEl) return;
    const t = parseFloat(thresholdDemoSliderEl.value) / 100;
    thresholdDemoValueEl.textContent = t.toFixed(2);

    if (thresholdDemoEl.open) {
    const ctx = thresholdDemoCanvas.getContext("2d");


    const W = thresholdDemoCanvas.clientWidth;
    const H = thresholdDemoCanvas.clientHeight;
    const dpr = window.devicePixelRatio || 1;
    if (thresholdDemoCanvas.width !== Math.round(W * dpr)) thresholdDemoCanvas.width = Math.round(W * dpr);
    if (thresholdDemoCanvas.height !== Math.round(H * dpr)) thresholdDemoCanvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const margin = { l: 40, r: 20, t: 20, b: 30 };
    const plotW = W - margin.l - margin.r;
    const plotH = H - margin.t - margin.b;
    ctx.clearRect(0, 0, W, H);

    const styles = getComputedStyle(document.documentElement);
    const axisColor = styles.getPropertyValue("--axis").trim();
    const mutedColor = styles.getPropertyValue("--text-muted").trim();
    const successColor = styles.getPropertyValue("--success").trim();
    const errorColor = styles.getPropertyValue("--error").trim();
    const primaryColor = styles.getPropertyValue("--primary").trim();
    const textColor = styles.getPropertyValue("--text").trim();

    const px = (p) => margin.l + p * plotW;
    const yMid = H - margin.b - 20;
    const yLow = H - margin.b - 8;

    // Axis
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.l, H - margin.b);
    ctx.lineTo(W - margin.r, H - margin.b);
    ctx.stroke();

    // Ticks
    ctx.fillStyle = mutedColor;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "center";
    for (const v of [0, 0.25, 0.5, 0.75, 1]) {
      const x = px(v);
      ctx.beginPath();
      ctx.moveTo(x, H - margin.b);
      ctx.lineTo(x, H - margin.b + 4);
      ctx.strokeStyle = axisColor;
      ctx.stroke();
      ctx.fillText(v.toFixed(2), x, H - margin.b + 18);
    }

    // Healthy dots (bottom row) — green if below threshold, red if above
    for (let i = 0; i < tdHealthyScores.length; i += 1) {
      const s = tdHealthyScores[i];
      const x = px(s);
      ctx.fillStyle = s >= t ? errorColor : successColor;
      ctx.beginPath();
      ctx.arc(x, yLow + tdHealthyJitter[i], 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Diseased dots (top row) — blue if above threshold (TP), red if below (FN)
    for (let i = 0; i < tdDiseasedScores.length; i += 1) {
      const s = tdDiseasedScores[i];
      const x = px(s);
      ctx.fillStyle = s >= t ? primaryColor : errorColor;
      ctx.beginPath();
      ctx.arc(x, yMid + tdDiseasedJitter[i] - 30, 3.5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Threshold line
    const tx = px(t);
    ctx.strokeStyle = textColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(tx, margin.t);
    ctx.lineTo(tx, H - margin.b);
    ctx.stroke();
    ctx.setLineDash([]);

    // Labels
    ctx.fillStyle = mutedColor;
    ctx.font = "10px ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText(uiText("diseased"), margin.l, yMid - 25);
    ctx.fillText(uiText("healthy"), margin.l, yLow - 14);

    }

    // Compute confusion matrix at this threshold
    const tp = tdDiseasedScores.filter((s) => s >= t).length;
    const fn = tdDiseasedScores.length - tp;
    const fp = tdHealthyScores.filter((s) => s >= t).length;
    const tn = tdHealthyScores.length - fp;

    // Update matrix cells
    const setCell = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = String(value);
    };
    setCell("tdTp", tp);
    setCell("tdFp", fp);
    setCell("tdFn", fn);
    setCell("tdTn", tn);

    // Compute metrics using core.calculateMetrics for consistency
    const prevalence = (tp + fn) / (tp + fp + fn + tn);
    const preTestProb = prevalence * 100;
    const metrics = core.calculateMetrics(
      { tp, fp, fn, tn, preTestProb },
      { continuityCorrection: "auto" }
    );

    const setStat = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = core.formatPercentage(value);
    };
    setStat("tdSens", metrics.sensitivity.value);
    setStat("tdSpec", metrics.specificity.value);
    setStat("tdPpv", metrics.ppv.value);
    setStat("tdNpv", metrics.npv.value);

    // Contextual note
    const sens = metrics.sensitivity.value;
    const spec = metrics.specificity.value;
    let noteKey;
    if (sens > 0.95 && spec < 0.4) {
      noteKey = "thresholdDemo.note.low";
    } else if (spec > 0.95 && sens < 0.5) {
      noteKey = "thresholdDemo.note.high";
    } else if (sens > 0.8 && spec > 0.8) {
      noteKey = "thresholdDemo.note.balanced";
    } else if (sens >= spec) {
      noteKey = "thresholdDemo.note.sens";
    } else {
      noteKey = "thresholdDemo.note.spec";
    }
    if (thresholdDemoNoteEl) {
      thresholdDemoNoteEl.textContent = tr(noteKey, {
        sens: core.formatPercentage(sens),
        spec: core.formatPercentage(spec),
      });
    }
  }

  if (thresholdDemoSliderEl) {
    thresholdDemoSliderEl.addEventListener("input", scheduler.schedule);
  }

  function redrawFaganNomogram() {
    if (!activeSnapshot) return;
    const metrics = core.calculateMetrics(activeSnapshot.input, activeSnapshot.options);
    renderFaganNomogram(faganCanvas, faganNomogramEl, {
      preTest: metrics.preTestProbability.value, lrPositive: metrics.lrPositive.value,
      lrNegative: metrics.lrNegative.value, postPositive: metrics.postTestPositive.value,
      postNegative: metrics.postTestNegative.value,
    });
  }

  scheduler.register(faganCanvas, redrawFaganNomogram, () => Boolean(activeSnapshot));
  scheduler.register(rocCanvas, recomputeRoc, () => rocPanelEl.style.display !== "none" && rocPanelEl.open);
  scheduler.register(prevalenceCanvas, () => {
    drawPrevalenceChart(prevalenceState.sens, prevalenceState.spec, Number(prevalenceSliderEl.value) / 100);
  }, () => prevalenceExplorerEl.style.display !== "none" && prevalenceExplorerEl.open);
  scheduler.register(thresholdDemoCanvas, renderThresholdDemo, () => thresholdDemoEl.style.display !== "none");

  refreshLocaleResults = () => {
    feedbackEl.textContent = i18n.relocalise(feedbackEl.textContent);
    sequentialFeedbackEl.textContent = i18n.relocalise(sequentialFeedbackEl.textContent);
    renderHistory();
    if (kappaResultEl.children.length) computeKappa();
    const activeDataset = caseState.datasetKey ? datasetStore.getDataset(caseState.datasetKey) : null;
    if (activeDataset) displayDatasetReference(activeDataset);
    if (!activeSnapshot) {
      clearRail();
      clearTeachingNote();
      return;
    }
    renderBiasWarnings([...core.buildBiasWarnings(activeSnapshot.input), ...datasetStore.buildDatasetWarnings(activeDataset)]);
    updateSequentialPretestLabel();
    updateThresholdView();
    updatePrevalenceReadout(Number(prevalenceSliderEl.value));
    recomputeRoc();
    for (const row of rocRowsEl.children) {
      row.title = row.dataset.provenance === "simulated" ? uiText("Synthetic cutoff — generated from a binormal fit of the first row.")
        : row.dataset.provenance === "edited-simulated" ? uiText("Edited simulated cutoff — still derived from a binormal model.") : "";
      for (const input of row.querySelectorAll("input")) {
        const field = input.dataset.field;
        input.setAttribute("aria-label", tr("roc.rowAria", { field: field === "cutoff" ? uiText("Cutoff") : uiText(field.toUpperCase()) }));
      }
      row.querySelector("button").setAttribute("aria-label", uiText("Remove this cutoff row"));
    }
    const metrics = core.calculateMetrics(activeSnapshot.input, { ...activeSnapshot.options, locale: i18n.getLocale() });
    renderHeadline(resultsHeadlineEl, metrics);
    renderSecondary(resultsSecondaryEl, metrics);
    renderBayesianUpdate(bayesianUpdateEl, metrics);
    updateTeachingNote(metrics, activeSnapshot.input, activeDataset);
    if (sequentialResultsEl.children.length) calculateSequentialTest();
    renderThresholdDemo();
    scheduler.schedule();
  };

  form.addEventListener("input", (event) => {
    if (!["tp", "fp", "fn", "tn", "preTestProb"].includes(event.target.id)) return;
    if (caseState.datasetKey) {
      caseState.modified = true;
      datasetSelect.value = "";
      setCase("named", tr("case.modified", { name: tr("dataset." + caseState.datasetKey + ".name") }));
    }
    activeSnapshot = null;
    clearMainResults();
    clearFaganNomogram(faganNomogramEl, faganCanvas);
    hidePrevalenceExplorer(); hideSequentialTest(); hideThresholdPanel(); hideThresholdDemo(); hideRocPanel();
    renderBiasWarnings([]);
    clearTeachingNote();
    clearRail();
    setFeedback(uiText("Inputs changed. Calculate to update results."), false);
  });

  function applyDataset(dataset) {
    document.getElementById("tp").value = dataset.tp;
    document.getElementById("fp").value = dataset.fp;
    document.getElementById("fn").value = dataset.fn;
    document.getElementById("tn").value = dataset.tn;
    document.getElementById("preTestProb").value = dataset.preTestProb;
  }

  function setFeedback(message, isSuccess) {
    feedbackEl.textContent = message;
    feedbackEl.classList.remove("error", "success");
    if (!message) {
      return;
    }
    feedbackEl.classList.add(isSuccess ? "success" : "error");
  }
});

// Theme Management
function initializeTheme() {
  const savedTheme = preferences.getItem("diagcalc-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = ["dark", "light"].includes(savedTheme) ? savedTheme : (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  preferences.setItem("diagcalc-theme", newTheme);
  updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
  const toggle = document.getElementById("themeToggle");
  if (!toggle) {
    return;
  }

  const i18n = window.DiagcalcI18n;
  const nextMode = theme === "dark" ? "light" : "dark";
  toggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
  toggle.setAttribute("aria-label", i18n
    ? i18n.t(nextMode === "light" ? "theme.toggle.light" : "theme.toggle.dark")
    : (nextMode === "light" ? "Switch to light mode" : "Switch to dark mode"));
}

// Dataset Reference Display
function displayDatasetReference(dataset) {
  const referenceEl = document.getElementById("dataset-reference");
  if (!referenceEl) {
    return;
  }

  const ref = dataset.reference;
  referenceEl.innerHTML = "";

  const heading = document.createElement("h4");
  heading.textContent = window.DiagcalcI18n.text("Illustrative teaching scenario");
  referenceEl.appendChild(heading);

  const desc = document.createElement("p");
  const descStrong = document.createElement("strong");
  descStrong.textContent = window.DiagcalcI18n.text(dataset.description);
  desc.appendChild(descStrong);
  referenceEl.appendChild(desc);

  referenceEl.style.display = "block";
  if (!ref) return;
  const citation = document.createElement("p");
  citation.className = "reference-citation";
  citation.textContent = `${ref.authors} ${ref.title}. `;

  const em = document.createElement("em");
  em.textContent = ref.journal;
  citation.appendChild(em);
  citation.appendChild(document.createTextNode(". "));

  const link = document.createElement("a");
  link.href = ref.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.textContent = `DOI: ${ref.doi}`;
  citation.appendChild(link);

  referenceEl.appendChild(citation);
  referenceEl.style.display = "block";
}

// Fagan Nomogram Rendering
function clearFaganNomogram(container, canvas) {
  if (container) {
    container.style.display = "none";
  }
  clearFaganSummary();

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (context) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function clearFaganSummary() {
  const ids = ["faganPreValue", "faganLrPosValue", "faganLrNegValue", "faganPostPosValue", "faganPostNegValue"];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (el) el.textContent = "—";
  }
}

function updateFaganSummary({ preTest, lrPositive, lrNegative, postPositive, postNegative }) {
  const fmt = window.DiagcalcCore;
  setIf("faganPreValue", fmt.formatPercentage(preTest));
  setIf("faganLrPosValue", fmt.formatLikelihood(lrPositive));
  setIf("faganLrNegValue", fmt.formatLikelihood(lrNegative));
  setIf("faganPostPosValue", fmt.formatPercentage(postPositive));
  setIf("faganPostNegValue", fmt.formatPercentage(postNegative));
}

function setIf(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function renderFaganNomogram(canvas, container, data) {
  if (!canvas || !container) return;
  updateFaganSummary(data);
  container.style.display = "block";
  window.DiagcalcCharts.drawFagan(canvas, data);
}
