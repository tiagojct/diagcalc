const preferences = window.DiagcalcStorage.createStorage(() => window.localStorage);

document.addEventListener("DOMContentLoaded", () => {
  const core = window.DiagcalcCore;
  const datasetStore = window.DiagcalcDatasets;
  const i18n = window.DiagcalcI18n;
  const caseStore = window.DiagcalcCase;
  const scheduler = window.DiagcalcCharts.createScheduler();
  let activeSnapshot = null;
  let refreshLocaleResults = () => {};
  const feedbackEl = document.getElementById("feedback");

  if (!core || !datasetStore) {
    const missing = [!core && "DiagcalcCore", !datasetStore && "DiagcalcDatasets"].filter(Boolean).join(" and ");
    console.error(`DIAGCALC: required script(s) failed to load: ${missing}.`);
    if (feedbackEl) {
      feedbackEl.textContent = "Calculator failed to load. Refresh the page or check the network tab for missing scripts.";
      feedbackEl.classList.add("error");
    }
    return;
  }

  function tr(key, vars) {
    return i18n ? i18n.t(key, vars) : key;
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
    const name = caseState.kind === "adhoc" ? tr("app.case.adhoc") : caseState.label;
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

  const datasets = datasetStore.datasets;
  const form = document.getElementById("inputForm");
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

  initializeTheme();

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
    if (!selected || !datasets[selected]) {
      clearMainResults();
      hideRocPanel();
      activeSnapshot = null;
      caseState.datasetKey = null;
      caseState.modified = false;
      datasetReferenceEl.style.display = "none";
      setCase("empty");
      return;
    }

    const dataset = datasets[selected];
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
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
      hideThresholdDemo();
      hideRocPanel();
      renderBiasWarnings([]);
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
  window.addEventListener("beforeprint", () => {
    document.querySelectorAll("details").forEach((d) => {
      if (PRINT_SKIP_IDS.has(d.id)) return;
      d.dataset.printPrevOpen = d.open ? "1" : "0";
      d.open = true;
    });
  });
  window.addEventListener("afterprint", () => {
    document.querySelectorAll("details").forEach((d) => {
      if (!("printPrevOpen" in d.dataset)) return;
      d.open = d.dataset.printPrevOpen === "1";
      delete d.dataset.printPrevOpen;
    });
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
      setFeedback(validation.message, false);
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
      hideThresholdDemo();
      hideRocPanel();
      renderBiasWarnings([]);
      return;
    }

    const metrics = core.calculateMetrics(data, { continuityCorrection: currentContinuityMode(), locale: i18n ? i18n.getLocale() : "en" });
    activeSnapshot = caseStore.createSnapshot(data, { continuityCorrection: currentContinuityMode() }, {
      label: caseState.label || "Custom case", datasetKey: caseState.datasetKey,
      modified: caseState.modified, provenance: caseState.datasetKey ? datasets[caseState.datasetKey].provenance : null,
    });
    if (caseState.kind === "empty") {
      setCase("adhoc");
    }
    renderBiasWarnings([...core.buildBiasWarnings(data), ...datasetStore.buildDatasetWarnings(datasets[caseState.datasetKey])]);
    renderHeadline(resultsHeadlineEl, metrics);
    renderSecondary(resultsSecondaryEl, metrics);
    renderBayesianUpdate(bayesianUpdateEl, metrics);
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
    if (entries.length && caseStore.fingerprint(entries[0]) === caseStore.fingerprint(activeSnapshot)) return;
    entries.unshift(activeSnapshot);
    writeHistory(entries.slice(0, HISTORY_MAX));
  }

  function renderHistory() {
    if (!historyPanelEl || !historyListEl) return;
    const entries = readHistory();
    const liveIds = new Set(entries.map((entry) => entry.id));
    for (const id of historySelected) if (!liveIds.has(id)) historySelected.delete(id);
    if (entries.length === 0) {
      historyPanelEl.style.display = "none";
      historyPanelEl.open = false;
      if (historyCompareEl) historyCompareEl.replaceChildren();
      return;
    }
    historyPanelEl.style.display = "block";
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
      const ts = new Date(entry.savedAt).toLocaleString();
      const fields = [
        ["history-item-title", entry.label],
        ["history-item-meta", `TP ${entry.input.tp} · FP ${entry.input.fp} · FN ${entry.input.fn} · TN ${entry.input.tn} · pre ${entry.input.preTestProb}%`],
        ["history-item-stats", `sens ${core.formatPercentage(entry.summary.sensitivity)} · spec ${core.formatPercentage(entry.summary.specificity)} · post+ ${core.formatPercentage(entry.summary.postTestPositive)} · post− ${core.formatPercentage(entry.summary.postTestNegative)}`],
        ["history-item-date", `${ts} · v${entry.engineVersion} · ${entry.options.continuityCorrection}${entry.legacy ? " · Legacy: original settings unknown; recomputed with auto" : ""}`],
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
      reloadBtn.textContent = "Reload";
      reloadBtn.addEventListener("click", () => reloadHistoryEntry(entry));
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "secondary history-item-delete";
      deleteBtn.textContent = "×";
      deleteBtn.title = "Delete this entry";
      deleteBtn.setAttribute("aria-label", "Delete history entry");
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
    caseState.datasetKey = entry.datasetKey && datasets[entry.datasetKey] ? entry.datasetKey : null;
    caseState.modified = entry.modified;
    hideRocPanel();
    if (datasetSelect && caseState.datasetKey && !entry.modified) {
      datasetSelect.value = entry.datasetKey;
      displayDatasetReference(datasets[entry.datasetKey]);
      setCase("named", datasets[entry.datasetKey].name);
    } else if (datasetSelect) {
      datasetSelect.value = "";
      if (caseState.datasetKey) displayDatasetReference(datasets[caseState.datasetKey]);
      else datasetReferenceEl.style.display = "none";
      setCase("named", entry.label);
    }
    setFeedback(tr("feedback.history.reloaded", { label: entry.label }), true);
    calculateAndRender();
    if (entry.legacy || entry.engineVersion !== window.DiagcalcMeta.version) {
      setFeedback("Case recalculated with the current engine. Legacy history used auto because its original settings were not recorded.", true);
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
      th.textContent = e.label;
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
    const tbody = document.createElement("tbody");
    const rows = [
      ["TP/FP/FN/TN", (e) => `${e.input.tp} / ${e.input.fp} / ${e.input.fn} / ${e.input.tn}`],
      ["Pre-test", (e) => `${e.input.preTestProb}%`],
      ["Engine / continuity", (e) => `${e.engineVersion} / ${e.options.continuityCorrection}`],
      ["Sensitivity", (e) => core.formatPercentage(e.summary.sensitivity)],
      ["Specificity", (e) => core.formatPercentage(e.summary.specificity)],
      ["PPV", (e) => core.formatPercentage(e.summary.ppv)],
      ["NPV", (e) => core.formatPercentage(e.summary.npv)],
      ["LR+", (e) => core.formatLikelihood(e.summary.lrPositive)],
      ["LR−", (e) => core.formatLikelihood(e.summary.lrNegative)],
      ["Post-test (+)", (e) => core.formatPercentage(e.summary.postTestPositive)],
      ["Post-test (−)", (e) => core.formatPercentage(e.summary.postTestNegative)],
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
      if (!confirm("Clear all saved history? This cannot be undone.")) return;
      writeHistory([]);
      historySelected.clear();
      renderHistory();
    });
  }

  renderHistory();

  function showRocPanel(firstRow) {
    if (!rocPanelEl) return;
    rocPanelEl.style.display = "block";
    if (rocRowsEl.children.length === 0) {
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
    const tr = document.createElement("tr");
    tr.dataset.provenance = opts && opts.synthetic ? "simulated" : "observed";
    if (opts && opts.synthetic) {
      tr.classList.add("roc-row--synthetic");
      tr.title = "Synthetic cutoff — generated from a binormal fit of the first row.";
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
        if (tr.dataset.provenance !== "observed") {
          tr.dataset.provenance = "edited-simulated";
          tr.title = "Edited simulated cutoff — still derived from a binormal model.";
        }
        recomputeRoc();
      });
      input.setAttribute("aria-label", `ROC row ${field}`);
      td.appendChild(input);
      tr.appendChild(td);
    }
    const removeTd = document.createElement("td");
    const removeBtn = document.createElement("button");
    removeBtn.type = "button";
    removeBtn.className = "roc-remove";
    removeBtn.textContent = "×";
    removeBtn.setAttribute("aria-label", "Remove this cutoff row");
    removeBtn.addEventListener("click", () => {
      tr.remove();
      recomputeRoc();
    });
    removeTd.appendChild(removeBtn);
    tr.appendChild(removeTd);
    rocRowsEl.appendChild(tr);
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
        `${error.row ? `Row ${error.row}: ` : ""}${error.message}`).join(" ");
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
      warning.textContent = "Includes simulated or edited simulated cutoffs. AUC and optimum are illustrative, not empirical estimates.";
      rocReadoutEl.appendChild(warning);
    }
    const stats = [
      [roc.simulated ? "Illustrative AUC (includes simulated rows)" : "AUC (trapezoid estimate)", roc.auc.toFixed(3)],
      ["Cutoffs", String(roc.points.length)],
      [roc.simulated ? "Illustrative Youden optimum" : "Youden optimum", roc.optimalPoint
        ? `cutoff ${roc.optimalPoint.cutoff ?? "—"} (sens ${core.formatPercentage(roc.optimalPoint.sens)}, spec ${core.formatPercentage(roc.optimalPoint.spec)}, J=${roc.optimalPoint.youden.toFixed(3)})`
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
      let seedSource = "ROC row 1";
      if (!seed) {
        const form = readFormValues();
        if (isValid(form)) {
          seed = form;
          seedSource = "main form";
        }
      }
      if (!seed) {
        if (rocReadoutEl) {
          rocReadoutEl.textContent = "Need a valid 2×2 (TP / FP / FN / TN) before synthetic cutoffs can be generated — fill the main form or row 1 first.";
        }
        return;
      }
      document.getElementById("rocDirection").value = "higher";
      const synth = core.generateSyntheticRocPoints(seed, 7);
      if (synth.length === 0) {
        if (rocReadoutEl) {
          rocReadoutEl.textContent = "Could not fit a binormal model to that 2×2 — the synthetic scaffold needs at least one diseased and one non-diseased case.";
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
        flash.textContent = `Added ${synth.length} synthetic cutoffs from a binormal fit (seed: ${seedSource}). Editing a row preserves its simulated origin.`;
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
      kappaResultEl.innerHTML = `<p class="kappa-error">Enter non-negative integers in all four cells.</p>`;
      return;
    }
    const result = core.calcCohenKappa(inputs);
    if (!result) {
      kappaResultEl.innerHTML = `<p class="kappa-error">Total cannot be zero.</p>`;
      return;
    }
    kappaResultEl.innerHTML = "";
    const stats = [
      ["κ", Number.isFinite(result.value) ? result.value.toFixed(3) : "—"],
      ["95% CI", result.ci ? `${result.ci.lower.toFixed(3)} to ${result.ci.upper.toFixed(3)}` : "—"],
      ["Observed agreement (p_o)", core.formatPercentage(result.observed)],
      ["Expected agreement (p_e)", core.formatPercentage(result.expected)],
      ["N", String(result.n)],
      ["Interpretation", result.interpretation],
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
    heading.textContent = warnings.length === 1 ? "Heads up" : "Heads up";
    biasWarningsEl.appendChild(heading);
    const list = document.createElement("ul");
    list.className = "bias-warnings-list";
    for (const msg of warnings) {
      const li = document.createElement("li");
      li.textContent = msg;
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

  function hideThresholdPanel() {
    if (!thresholdPanelEl) return;
    thresholdPanelEl.style.display = "none";
    thresholdPanelEl.open = false;
    thresholdState.lrPositive = NaN;
    thresholdState.lrNegative = NaN;
    thresholdState.preTest = NaN;
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
      thresholdReadoutEl.textContent = "Thresholds unavailable: this display requires LR+ > 1 and 0 ≤ LR− < 1. Review test direction.";
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
    const prePct = Number.isFinite(thresholdState.preTest) ? thresholdState.preTest * 100 : NaN;
    if (Number.isFinite(prePct)) {
      thresholdMarkerPreEl.style.left = `${core.clamp(prePct, 0, 100)}%`;
      thresholdMarkerPreEl.style.display = "block";
    } else {
      thresholdMarkerPreEl.style.display = "none";
    }

    thresholdReadoutEl.innerHTML = "";
    const stats = [
      ["Testing threshold (don't test below)", core.formatPercentage(Plow)],
      ["Treatment threshold (Pt)", core.formatPercentage(Pt)],
      ["Test-treatment threshold (just treat above)", core.formatPercentage(Phigh)],
      ["Decision at current pre-test", classifyPreTest(prePct, lowPct, highPct, Ptpercent)],
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
    if (prePct < lowPct) return "Don't test — even a positive result wouldn't reach Pt.";
    if (prePct > highPct) return "Treat without testing — even a negative result stays above Pt.";
    return `Test useful — result can move you across the Pt=${Ptpct.toFixed(0)}% line.`;
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
    sequentialPretestEl.textContent = `Test 2 pre-test probability: ${core.formatPercentage(pct / 100)} (from test 1's post-test after a ${fromLabel} result).`;
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
      setSequentialFeedback("Calculate test 1 first.", false);
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
      setSequentialFeedback(validation.message, false);
      return;
    }

    const metrics = core.calculateMetrics(input, { continuityCorrection: currentContinuityMode(), locale: i18n ? i18n.getLocale() : "en" });
    renderResults(sequentialResultsEl, metrics);
    setSequentialFeedback(
      `Test 2 complete. Post-test (+) ${core.formatPercentage(metrics.postTestPositive.value)}, post-test (−) ${core.formatPercentage(metrics.postTestNegative.value)}.`,
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
      setSequentialFeedback("Test 2 fields cleared.", true);
    });
  }

  function showPrevalenceExplorer(sens, spec, currentPrev) {
    if (!prevalenceExplorerEl || !Number.isFinite(sens) || !Number.isFinite(spec)) {
      return;
    }
    prevalenceState.sens = sens;
    prevalenceState.spec = spec;
    prevalenceExplorerEl.style.display = "block";
    const startPercent = Math.max(0.1, Math.min(99.9, (currentPrev || 0.1) * 100));
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
      ["PPV", ppv],
      ["NPV", npv],
      ["Post-test (+)", postPositive],
      ["Post-test (−)", postNegative],
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
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
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
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.textAlign = "left";
    ctx.fillText("diseased", margin.l, yMid - 25);
    ctx.fillText("healthy", margin.l, yLow - 14);

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
    if (!activeSnapshot) return;
    const metrics = core.calculateMetrics(activeSnapshot.input, { ...activeSnapshot.options, locale: i18n.getLocale() });
    renderHeadline(resultsHeadlineEl, metrics);
    renderSecondary(resultsSecondaryEl, metrics);
    renderBayesianUpdate(bayesianUpdateEl, metrics);
    if (sequentialResultsEl.children.length) calculateSequentialTest();
    renderThresholdDemo();
    scheduler.schedule();
  };

  form.addEventListener("input", (event) => {
    if (!["tp", "fp", "fn", "tn", "preTestProb"].includes(event.target.id)) return;
    if (caseState.datasetKey) {
      caseState.modified = true;
      datasetSelect.value = "";
      setCase("named", `Customised: ${datasets[caseState.datasetKey].name}`);
    }
    activeSnapshot = null;
    clearMainResults();
    clearFaganNomogram(faganNomogramEl, faganCanvas);
    hidePrevalenceExplorer(); hideSequentialTest(); hideThresholdPanel(); hideThresholdDemo(); hideRocPanel();
    renderBiasWarnings([]);
    setFeedback("Inputs changed. Calculate to update results.", false);
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

  const icon = toggle.querySelector(".theme-icon");
  if (icon) {
    icon.textContent = theme === "dark" ? "☀" : "◐";
  }
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
  heading.textContent = "Illustrative teaching scenario";
  referenceEl.appendChild(heading);

  const desc = document.createElement("p");
  const descStrong = document.createElement("strong");
  descStrong.textContent = dataset.description;
  desc.appendChild(descStrong);
  referenceEl.appendChild(desc);

  const provenance = document.createElement("p");
  provenance.textContent = dataset.provenance.note;
  referenceEl.appendChild(provenance);
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
