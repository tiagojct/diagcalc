document.addEventListener("DOMContentLoaded", () => {
  const core = window.DiagcalcCore;
  const datasetStore = window.DiagcalcDatasets;
  const i18n = window.DiagcalcI18n;
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
  const caseState = { kind: "empty", label: "" };
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
    const stored = localStorage.getItem("diagcalc-continuity");
    if (stored && ["auto", "always", "never"].includes(stored)) {
      continuityModeEl.value = stored;
    }
    continuityModeEl.addEventListener("change", () => {
      localStorage.setItem("diagcalc-continuity", continuityModeEl.value);
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
      redrawFaganNomogram();
      if (Number.isFinite(prevalenceState.sens) && Number.isFinite(prevalenceState.spec)) {
        const prev = parseFloat(prevalenceSliderEl.value);
        drawPrevalenceChart(prevalenceState.sens, prevalenceState.spec, prev / 100);
      }
    });
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    calculateAndRender();
  });

  datasetSelect.addEventListener("change", () => {
    const selected = datasetSelect.value;
    if (!selected || !datasets[selected]) {
      datasetReferenceEl.style.display = "none";
      setCase("empty");
      return;
    }

    const dataset = datasets[selected];
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
      setCase("empty");
      setFeedback(tr("feedback.cleared"), true);
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
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
    const preTestValue = core.normaliseDecimal(preTestField.value);
    return {
      tp: core.safeParseInt(document.getElementById("tp").value),
      fp: core.safeParseInt(document.getElementById("fp").value),
      fn: core.safeParseInt(document.getElementById("fn").value),
      tn: core.safeParseInt(document.getElementById("tn").value),
      preTestProb: preTestValue === "" ? NaN : parseFloat(preTestValue),
    };
  }

  function calculateAndRender() {
    const data = readFormValues();
    const validation = core.validateInputs(data);

    if (!validation.valid) {
      clearMainResults();
      setFeedback(validation.message, false);
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
      hideRocPanel();
      renderBiasWarnings([]);
      return;
    }

    const metrics = core.calculateMetrics(data, { continuityCorrection: currentContinuityMode() });
    if (caseState.kind === "empty") {
      setCase("adhoc");
    }
    renderBiasWarnings(core.buildBiasWarnings(data));
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
    showRocPanel(data);
    saveToHistory(data, metrics);
    renderHistory();
    setFeedback(tr("feedback.calc.ok"), true);
  }

  // ── Calculation history ──────────────────────────────────────────────────

  function readHistory() {
    try {
      const raw = localStorage.getItem(HISTORY_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      console.warn("DIAGCALC: history could not be read from localStorage", err);
      return [];
    }
  }

  function writeHistory(entries) {
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
    } catch (err) {
      console.warn("DIAGCALC: history could not be saved to localStorage", err);
    }
  }

  function inputFingerprint(input) {
    return `${input.tp}|${input.fp}|${input.fn}|${input.tn}|${input.preTestProb}`;
  }

  function saveToHistory(input, metrics) {
    const entries = readHistory();
    const fp = inputFingerprint(input);
    if (entries.length > 0 && entries[0].fingerprint === fp) {
      return; // skip dedup on consecutive identical inputs
    }
    const datasetKey = datasetSelect ? datasetSelect.value : "";
    const datasetName = datasetKey && datasets[datasetKey] ? datasets[datasetKey].name : "Custom case";
    const entry = {
      id: Date.now(),
      savedAt: new Date().toISOString(),
      label: datasetName,
      datasetKey: datasetKey || null,
      fingerprint: fp,
      input,
      summary: {
        sensitivity: metrics.sensitivity.value,
        specificity: metrics.specificity.value,
        ppv: metrics.ppv.value,
        npv: metrics.npv.value,
        lrPositive: metrics.lrPositive.value,
        lrNegative: metrics.lrNegative.value,
        postTestPositive: metrics.postTestPositive.value,
        postTestNegative: metrics.postTestNegative.value,
      },
    };
    entries.unshift(entry);
    if (entries.length > HISTORY_MAX) entries.length = HISTORY_MAX;
    writeHistory(entries);
  }

  function renderHistory() {
    if (!historyPanelEl || !historyListEl) return;
    const entries = readHistory();
    if (entries.length === 0) {
      historyPanelEl.style.display = "none";
      historyPanelEl.open = false;
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
      labelEl.innerHTML = `
        <span class="history-item-title">${entry.label}</span>
        <span class="history-item-meta">TP ${entry.input.tp} · FP ${entry.input.fp} · FN ${entry.input.fn} · TN ${entry.input.tn} · pre ${entry.input.preTestProb}%</span>
        <span class="history-item-stats">sens ${core.formatPercentage(entry.summary.sensitivity)} · spec ${core.formatPercentage(entry.summary.specificity)} · post+ ${core.formatPercentage(entry.summary.postTestPositive)} · post− ${core.formatPercentage(entry.summary.postTestNegative)}</span>
        <span class="history-item-date">${ts}</span>
      `;

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
    if (datasetSelect && entry.datasetKey && datasets[entry.datasetKey]) {
      datasetSelect.value = entry.datasetKey;
      displayDatasetReference(datasets[entry.datasetKey]);
      setCase("named", datasets[entry.datasetKey].name);
    } else if (datasetSelect) {
      datasetSelect.value = "";
      datasetReferenceEl.style.display = "none";
      setCase("named", entry.label);
    }
    setFeedback(tr("feedback.history.reloaded", { label: entry.label }), true);
    calculateAndRender();
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
        tr.classList.remove("roc-row--synthetic");
        tr.removeAttribute("title");
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
    return Array.from(rocRowsEl.children).map((tr) => {
      const obj = {};
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
    const validRows = rows.filter((r) =>
      Number.isInteger(r.tp) && Number.isInteger(r.fp) && Number.isInteger(r.fn) && Number.isInteger(r.tn) &&
      (r.tp + r.fn > 0) && (r.tn + r.fp > 0)
    );

    if (validRows.length === 0) {
      rocReadoutEl.textContent = "Add at least one complete cutoff row (TP, FP, FN, TN) to plot.";
      const ctx = rocCanvas.getContext("2d");
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, rocCanvas.width, rocCanvas.height);
      }
      return;
    }

    const roc = core.calculateROC(validRows);
    if (!roc) {
      rocReadoutEl.textContent = "Could not compute ROC from these rows.";
      return;
    }
    drawRocCurve(roc);
    renderRocReadout(roc);
  }

  function renderRocReadout(roc) {
    rocReadoutEl.innerHTML = "";
    const stats = [
      ["AUC (trapezoid)", roc.auc.toFixed(3)],
      ["Cutoffs", String(roc.points.length)],
      ["Youden optimum", roc.optimalPoint
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
    if (!rocCanvas) return;
    const ctx = rocCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = rocCanvas.getBoundingClientRect();
    rocCanvas.width = rect.width * dpr;
    rocCanvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const margin = { top: 28, right: 24, bottom: 44, left: 50 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    ctx.clearRect(0, 0, W, H);

    const styles = getComputedStyle(document.documentElement);
    const axisColor = styles.getPropertyValue("--axis").trim();
    const textColor = styles.getPropertyValue("--text").trim();
    const mutedColor = styles.getPropertyValue("--text-muted").trim();
    const primaryColor = styles.getPropertyValue("--primary").trim();
    const warningColor = styles.getPropertyValue("--crew-pip").trim();

    const px = (f) => margin.left + f * plotW;
    const py = (s) => margin.top + (1 - s) * plotH;

    // Axes
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();

    // Chance diagonal
    ctx.strokeStyle = mutedColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(px(0), py(0));
    ctx.lineTo(px(1), py(1));
    ctx.stroke();
    ctx.setLineDash([]);

    // Tick labels
    ctx.fillStyle = mutedColor;
    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      ctx.textAlign = "center";
      ctx.fillText(`${(t * 100).toFixed(0)}`, px(t), margin.top + plotH + 14);
      ctx.textAlign = "right";
      ctx.fillText(`${(t * 100).toFixed(0)}`, margin.left - 5, py(t) + 3);
    }

    ctx.fillStyle = textColor;
    ctx.font = "11px 'Atkinson Hyperlegible Next', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("1 − specificity (FPR, %)", margin.left + plotW / 2, H - 8);
    ctx.save();
    ctx.translate(14, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Sensitivity (TPR, %)", 0, 0);
    ctx.restore();

    // ROC line from (0,0) through points (sorted) to (1,1)
    const pts = [{ fpr: 0, sens: 0 }, ...roc.points, { fpr: 1, sens: 1 }];
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => {
      const x = px(p.fpr);
      const y = py(p.sens);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Plot the user's data points
    for (let i = 0; i < roc.points.length; i += 1) {
      const p = roc.points[i];
      const isOptimal = i === roc.optimalIndex;
      ctx.fillStyle = isOptimal ? warningColor : primaryColor;
      ctx.beginPath();
      ctx.arc(px(p.fpr), py(p.sens), isOptimal ? 7 : 4, 0, 2 * Math.PI);
      ctx.fill();
      if (isOptimal) {
        ctx.fillStyle = textColor;
        ctx.textAlign = "left";
        ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
        const label = `${p.cutoff !== null && p.cutoff !== "" ? p.cutoff : "best"}`;
        ctx.fillText(label, px(p.fpr) + 10, py(p.sens) - 4);
      }
    }

    // AUC label inside plot
    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(`AUC = ${roc.auc.toFixed(3)}`, margin.left + plotW - 8, margin.top + plotH - 10);
  }

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
      const synth = core.generateSyntheticRocPoints(seed, 5);
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
        firstSynth.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      // Surface that the click did something — the AUC update alone is easy
      // to miss when the scaffold lands on top of an already-populated curve.
      // Prepended *after* recomputeRoc to survive its innerHTML reset.
      if (rocReadoutEl) {
        const flash = document.createElement("p");
        flash.className = "roc-flash";
        flash.textContent = `Added ${synth.length} synthetic cutoffs from a binormal fit (seed: ${seedSource}). Edit any cell to convert that row to user data.`;
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
      thresholdReadoutEl.textContent = "Thresholds unavailable for this test (LR+ or LR− is undefined).";
      return;
    }

    const Plow = Number.isFinite(t.testingThreshold) ? t.testingThreshold : 0;
    const Phigh = Number.isFinite(t.testTreatmentThreshold) ? t.testTreatmentThreshold : 1;
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
    // Clamp away from exactly 100% so validation accepts it; 99.9999 keeps four 9s of fidelity.
    return Math.min(99.9999, Math.max(0, fraction * 100));
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

    const metrics = core.calculateMetrics(input, { continuityCorrection: currentContinuityMode() });
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
    if (!prevalenceCanvas || !Number.isFinite(sens) || !Number.isFinite(spec)) return;
    const ctx = prevalenceCanvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = prevalenceCanvas.getBoundingClientRect();
    prevalenceCanvas.width = rect.width * dpr;
    prevalenceCanvas.height = rect.height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const margin = { top: 28, right: 24, bottom: 40, left: 50 };
    const plotW = W - margin.left - margin.right;
    const plotH = H - margin.top - margin.bottom;
    ctx.clearRect(0, 0, W, H);

    const styles = getComputedStyle(document.documentElement);
    const axisColor = styles.getPropertyValue("--axis").trim();
    const textColor = styles.getPropertyValue("--text").trim();
    const ppvColor = styles.getPropertyValue("--accent-warm").trim();
    const npvColor = styles.getPropertyValue("--success").trim();
    const primaryColor = styles.getPropertyValue("--primary").trim();
    const mutedColor = styles.getPropertyValue("--text-muted").trim();

    const px = (p) => margin.left + p * plotW;
    const py = (v) => margin.top + (1 - v) * plotH;

    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin.left, margin.top);
    ctx.lineTo(margin.left, margin.top + plotH);
    ctx.lineTo(margin.left + plotW, margin.top + plotH);
    ctx.stroke();

    ctx.fillStyle = textColor;
    ctx.font = "11px 'Atkinson Hyperlegible Next', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Prevalence (%)", margin.left + plotW / 2, H - 10);
    ctx.save();
    ctx.translate(14, margin.top + plotH / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("Predictive value (%)", 0, 0);
    ctx.restore();

    ctx.font = "10px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillStyle = mutedColor;
    ctx.strokeStyle = axisColor;
    for (const t of [0, 25, 50, 75, 100]) {
      const x = px(t / 100);
      ctx.beginPath();
      ctx.moveTo(x, margin.top + plotH);
      ctx.lineTo(x, margin.top + plotH + 3);
      ctx.stroke();
      ctx.fillText(`${t}`, x, margin.top + plotH + 14);
    }
    ctx.textAlign = "right";
    for (const t of [0, 25, 50, 75, 100]) {
      const y = py(t / 100);
      ctx.beginPath();
      ctx.moveTo(margin.left - 3, y);
      ctx.lineTo(margin.left, y);
      ctx.stroke();
      ctx.fillText(`${t}`, margin.left - 5, y + 3);
    }

    function curve(fn, color) {
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= 200; i++) {
        const p = i / 200;
        const v = fn(p);
        if (!Number.isFinite(v)) continue;
        const x = px(p);
        const y = py(core.clamp(v, 0, 1));
        if (!started) { ctx.moveTo(x, y); started = true; } else { ctx.lineTo(x, y); }
      }
      ctx.stroke();
    }

    curve((p) => {
      const d = sens * p + (1 - spec) * (1 - p);
      return d > 0 ? (sens * p) / d : NaN;
    }, ppvColor);
    curve((p) => {
      const d = spec * (1 - p) + (1 - sens) * p;
      return d > 0 ? (spec * (1 - p)) / d : NaN;
    }, npvColor);

    const markerX = px(core.clamp(currentPrev, 0, 1));
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(markerX, margin.top);
    ctx.lineTo(markerX, margin.top + plotH);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.textAlign = "left";
    ctx.font = "11px 'Atkinson Hyperlegible Next', system-ui, sans-serif";
    ctx.fillStyle = ppvColor;
    ctx.fillRect(margin.left + 8, margin.top + 4, 14, 3);
    ctx.fillStyle = textColor;
    ctx.fillText("PPV", margin.left + 26, margin.top + 9);
    ctx.fillStyle = npvColor;
    ctx.fillRect(margin.left + 66, margin.top + 4, 14, 3);
    ctx.fillStyle = textColor;
    ctx.fillText("NPV", margin.left + 84, margin.top + 9);
  }

  function redrawFaganNomogram() {
    if (!faganNomogramEl || faganNomogramEl.style.display === "none") {
      return;
    }

    const data = readFormValues();
    const validation = core.validateInputs(data);
    if (!validation.valid) {
      return;
    }

    const metrics = core.calculateMetrics(data);
    renderFaganNomogram(faganCanvas, faganNomogramEl, {
      preTest: metrics.preTestProbability.value,
      lrPositive: metrics.lrPositive.value,
      lrNegative: metrics.lrNegative.value,
      postPositive: metrics.postTestPositive.value,
      postNegative: metrics.postTestNegative.value,
    });
  }

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

// Renders a single metric as a result card. Shared by the headline strip,
// the secondary grid, and the chained-test panel.
function renderMetricCard(metric, opts) {
  const o = opts || {};
  const card = document.createElement("article");
  card.className = "result-card";
  if (o.size) card.classList.add(`result-card--${o.size}`);
  if (o.accent) card.classList.add(`result-card--${o.accent}`);

  const title = document.createElement("h3");
  title.textContent = metric.label;
  card.appendChild(title);

  const value = document.createElement("p");
  value.className = "result-value";
  value.textContent = window.DiagcalcCore.formatValue(metric.value, metric.formatter);
  card.appendChild(value);

  // Visual indicator between the value and the CI.
  if (o.bar) {
    card.appendChild(renderInlineBar(metric.value, o.barVariant));
  } else if (o.band) {
    card.appendChild(renderBand(metric, o.band));
  }

  if (metric.ci) {
    const ci = document.createElement("p");
    ci.className = "result-ci";
    const fmt = window.DiagcalcCore.formatValue;
    ci.textContent = `95% CI: ${fmt(metric.ci.lower, metric.formatter)} – ${fmt(metric.ci.upper, metric.formatter)}`;
    card.appendChild(ci);
  }

  if (metric.note && !o.hideNote) {
    const note = document.createElement("p");
    note.className = "result-note";
    note.textContent = metric.note;
    card.appendChild(note);
  }

  return card;
}

// Thin fill bar showing a proportion (0..1) on a 0–100% track.
function renderInlineBar(value, variant) {
  const wrap = document.createElement("div");
  wrap.className = "result-bar";
  if (variant) wrap.classList.add(`result-bar--${variant}`);
  const fill = document.createElement("span");
  fill.className = "result-bar-fill";
  const pct = Number.isFinite(value) ? Math.min(100, Math.max(0, value * 100)) : 0;
  fill.style.width = `${pct}%`;
  wrap.appendChild(fill);
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", `${pct.toFixed(1)} percent of 100`);
  return wrap;
}

// 4-segment clinical-utility band with a marker at the value's position.
const BAND_DEFS = {
  "lr-plus":  { stops: [0, 2, 5, 10, 100],     labels: ["weak", "limited", "useful", "rule-in"] },
  "lr-minus": { stops: [0, 0.1, 0.2, 0.5, 1],  labels: ["rule-out", "useful", "limited", "weak"] },
  "dor":      { stops: [0, 1, 10, 100, 1000],  labels: ["poor", "limited", "useful", "very strong"] },
};

function bandPosition(value, stops) {
  if (Number.isNaN(value)) return 0;
  if (!Number.isFinite(value)) return value > 0 ? 100 : 0;
  if (value <= stops[0]) return 0;
  const segments = stops.length - 1;
  for (let i = 0; i < segments; i += 1) {
    if (value <= stops[i + 1]) {
      const span = stops[i + 1] - stops[i];
      const within = span > 0 ? (value - stops[i]) / span : 0;
      return ((i + within) / segments) * 100;
    }
  }
  return 100;
}

function renderBand(metric, kind) {
  const def = BAND_DEFS[kind];
  if (!def) return document.createComment(`unknown band: ${kind}`);
  const wrap = document.createElement("div");
  wrap.className = `result-band result-band--${kind}`;
  wrap.setAttribute("role", "img");

  for (let i = 0; i < def.labels.length; i += 1) {
    const zone = document.createElement("span");
    zone.className = `result-band-zone result-band-zone--${i}`;
    zone.setAttribute("title", def.labels[i]);
    wrap.appendChild(zone);
  }

  const pos = bandPosition(metric.value, def.stops);
  const marker = document.createElement("span");
  marker.className = "result-band-marker";
  marker.style.left = `${pos}%`;
  wrap.appendChild(marker);

  // Underlying tier labels — visible on hover via CSS, always read by AT.
  const ariaTier = def.labels[Math.min(def.labels.length - 1, Math.floor(pos / (100 / def.labels.length)))] || def.labels[0];
  wrap.setAttribute("aria-label", `${metric.label}: ${ariaTier} tier`);

  return wrap;
}

// Headline strip — the four numbers a clinician actually quotes: sens, spec,
// post-test (+), post-test (−). Rendered large with inline fill bars so the
// value is readable both as a number and as a visual quantity.
function renderHeadline(container, metrics) {
  if (!container) return;
  container.innerHTML = "";
  const items = [
    { metric: metrics.sensitivity,     accent: "neutral", barVariant: "neutral" },
    { metric: metrics.specificity,     accent: "neutral", barVariant: "neutral" },
    { metric: metrics.postTestPositive, accent: "warm",   barVariant: "warm" },
    { metric: metrics.postTestNegative, accent: "cool",   barVariant: "cool" },
  ];
  for (const { metric, accent, barVariant } of items) {
    container.appendChild(renderMetricCard(metric, {
      size: "lg", accent, hideNote: true, bar: true, barVariant,
    }));
  }
}

// Secondary grid — predictive values + likelihood ratios + DOR + NNS.
// Predictive values get inline bars; LR+/LR-/DOR get clinical-utility band
// indicators; NNS stays text-only.
function renderSecondary(container, metrics) {
  if (!container) return;
  container.innerHTML = "";
  const items = [
    { metric: metrics.ppv,                     bar: true, barVariant: "neutral" },
    { metric: metrics.npv,                     bar: true, barVariant: "neutral" },
    { metric: metrics.lrPositive,              band: "lr-plus" },
    { metric: metrics.lrNegative,              band: "lr-minus" },
    { metric: metrics.dor,                     band: "dor" },
    { metric: metrics.numberNeededToScreen },
  ];
  for (const item of items) {
    const { metric, ...chart } = item;
    container.appendChild(renderMetricCard(metric, { size: "sm", ...chart }));
  }
}

// Bayesian update strip — pre-test → post-test (+) and pre-test → post-test (−)
// as inline mini-bars, with the LR jump annotated in the middle. Replaces the
// old separate .probability-chart block.
function renderBayesianUpdate(container, metrics) {
  if (!container) return;
  container.innerHTML = "";
  const fmtPct = window.DiagcalcCore.formatPercentage;
  const fmtLR = window.DiagcalcCore.formatLikelihood;
  const pre = metrics.preTestProbability.value;
  const rows = [
    { to: metrics.postTestPositive.value, label: "Positive test", lr: metrics.lrPositive.value, variant: "warm" },
    { to: metrics.postTestNegative.value, label: "Negative test", lr: metrics.lrNegative.value, variant: "cool" },
  ];

  const preVal = Number.isFinite(pre) ? Math.min(1, Math.max(0, pre)) : 0;
  const prePct = preVal * 100;

  for (const row of rows) {
    const node = document.createElement("div");
    node.className = `bayesian-row bayesian-row--${row.variant}`;

    const label = document.createElement("span");
    label.className = "bayesian-row-label";
    label.textContent = row.label;

    const lr = document.createElement("span");
    lr.className = "bayesian-row-lr";
    lr.textContent = `LR × ${fmtLR(row.lr)}`;

    const toVal = Number.isFinite(row.to) ? Math.min(1, Math.max(0, row.to)) : 0;
    const toPct = toVal * 100;

    // Axis: a 0–100% rail with pre marker, arrow trail, post marker.
    const axis = document.createElement("div");
    axis.className = "bayesian-axis";
    if (toPct < prePct) axis.classList.add("rtl");
    axis.setAttribute("role", "img");
    axis.setAttribute(
      "aria-label",
      `${row.label}: pre-test ${fmtPct(pre)}, post-test ${fmtPct(row.to)}, likelihood ratio ${fmtLR(row.lr)}.`
    );

    const lo = Math.min(prePct, toPct);
    const hi = Math.max(prePct, toPct);

    const trail = document.createElement("span");
    trail.className = "bayesian-axis-trail";
    trail.style.left = `${lo}%`;
    trail.style.width = `${Math.max(0.001, hi - lo)}%`;
    axis.appendChild(trail);

    const preMarker = document.createElement("span");
    preMarker.className = "bayesian-axis-pre";
    preMarker.style.left = `${prePct}%`;
    preMarker.title = `Pre-test ${fmtPct(pre)}`;
    axis.appendChild(preMarker);

    const postMarker = document.createElement("span");
    postMarker.className = "bayesian-axis-post";
    postMarker.style.left = `${toPct}%`;
    postMarker.title = `Post-test ${fmtPct(row.to)}`;
    axis.appendChild(postMarker);

    const fromLabel = document.createElement("span");
    fromLabel.className = "bayesian-row-from";
    fromLabel.textContent = fmtPct(pre);
    const toLabel = document.createElement("span");
    toLabel.className = "bayesian-row-to";
    toLabel.textContent = fmtPct(row.to);

    node.appendChild(label);
    node.appendChild(fromLabel);
    node.appendChild(axis);
    node.appendChild(toLabel);
    node.appendChild(lr);
    container.appendChild(node);
  }
}

// Compat: still used by the chained-test panel which uses a simple grid.
function renderResults(container, metrics) {
  if (!container) return;
  container.innerHTML = "";
  for (const [, data] of Object.entries(metrics)) {
    container.appendChild(renderMetricCard(data, { size: "sm" }));
  }
}

// Theme Management
function initializeTheme() {
  const savedTheme = localStorage.getItem("diagcalc-theme");
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = savedTheme || (prefersDark ? "dark" : "light");
  document.documentElement.setAttribute("data-theme", theme);
  updateThemeIcon(theme);
}

function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", newTheme);
  localStorage.setItem("diagcalc-theme", newTheme);
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

  if (!dataset.reference) {
    referenceEl.style.display = "none";
    return;
  }

  const ref = dataset.reference;
  referenceEl.innerHTML = "";

  const heading = document.createElement("h4");
  heading.textContent = "Reference";
  referenceEl.appendChild(heading);

  const desc = document.createElement("p");
  const descStrong = document.createElement("strong");
  descStrong.textContent = dataset.description;
  desc.appendChild(descStrong);
  referenceEl.appendChild(desc);

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
  if (!canvas || !container) {
    return;
  }

  const { preTest, lrPositive, lrNegative, postPositive, postNegative } = data;

  if (!Number.isFinite(preTest)) {
    clearFaganNomogram(container, canvas);
    return;
  }

  updateFaganSummary({ preTest, lrPositive, lrNegative, postPositive, postNegative });

  container.style.display = "block";
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const displayWidth = rect.width;
  const displayHeight = rect.height;

  ctx.clearRect(0, 0, displayWidth, displayHeight);

  const margin = 60;
  const colWidth = (displayWidth - 2 * margin) / 3;
  const scaleHeight = displayHeight - 2 * margin;

  function probToY(probability) {
    const clampedProb = Math.max(0.001, Math.min(0.999, probability));
    const logit = Math.log(clampedProb / (1 - clampedProb));
    const minLogit = Math.log(0.001 / 0.999);
    const maxLogit = Math.log(0.999 / 0.001);
    const normalized = (logit - minLogit) / (maxLogit - minLogit);
    return margin + scaleHeight * (1 - normalized);
  }

  const styles = getComputedStyle(document.documentElement);
  const axisColor = styles.getPropertyValue("--axis").trim();
  const textColor = styles.getPropertyValue("--text").trim();
  const warmColor = styles.getPropertyValue("--accent-warm").trim();
  const successColor = styles.getPropertyValue("--success").trim();

  ctx.strokeStyle = axisColor;
  ctx.lineWidth = 2;

  const leftX = margin;
  const middleX = margin + colWidth * 1.5;
  const rightX = margin + colWidth * 3;

  ctx.beginPath();
  ctx.moveTo(leftX, margin);
  ctx.lineTo(leftX, margin + scaleHeight);
  ctx.moveTo(middleX, margin);
  ctx.lineTo(middleX, margin + scaleHeight);
  ctx.moveTo(rightX, margin);
  ctx.lineTo(rightX, margin + scaleHeight);
  ctx.stroke();

  ctx.fillStyle = textColor;
  ctx.font = "bold 12px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("Pre-test", leftX, margin - 30);
  ctx.fillText("Likelihood ratio", middleX, margin - 30);
  ctx.fillText("Post-test", rightX, margin - 30);

  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "right";
  [0.1, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99].forEach((p) => {
    const y = probToY(p / 100);
    ctx.fillText(`${p}%`, leftX - 5, y + 3);
  });

  ctx.textAlign = "center";
  ctx.fillText("Straight line from pre-test", middleX, margin + 8);
  ctx.fillText("to post-test probability", middleX, margin + 22);

  ctx.textAlign = "left";
  [0.1, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99].forEach((p) => {
    const y = probToY(p / 100);
    ctx.fillText(`${p}%`, rightX + 5, y + 3);
  });

  const preY = probToY(preTest);
  drawMarker(leftX, preY, axisColor);

  function midpointY(startY, endY) {
    return startY + (endY - startY) * ((middleX - leftX) / (rightX - leftX));
  }

  function drawMarker(x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  function drawLrLabel(y, label, value, color, alignRight) {
    const text = `${label} ${window.DiagcalcCore.formatLikelihood(value)}`;
    ctx.font = "11px 'JetBrains Mono', monospace";
    ctx.textAlign = alignRight ? "right" : "left";
    ctx.fillStyle = color;
    ctx.fillText(text, alignRight ? middleX - 12 : middleX + 12, y - 8);
  }

  if (lrPositive > 0) {
    const postPosY = probToY(postPositive);
    const lrPosY = midpointY(preY, postPosY);

    ctx.strokeStyle = warmColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(leftX, preY);
    ctx.lineTo(middleX, lrPosY);
    ctx.lineTo(rightX, postPosY);
    ctx.stroke();

    ctx.setLineDash([]);
    drawMarker(middleX, lrPosY, warmColor);
    drawMarker(rightX, postPosY, warmColor);
    drawLrLabel(lrPosY, "LR+", lrPositive, warmColor, true);
  }

  if (lrNegative > 0) {
    const postNegY = probToY(postNegative);
    const lrNegY = midpointY(preY, postNegY);

    ctx.strokeStyle = successColor;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(leftX, preY);
    ctx.lineTo(middleX, lrNegY);
    ctx.lineTo(rightX, postNegY);
    ctx.stroke();

    ctx.setLineDash([]);
    drawMarker(middleX, lrNegY, successColor);
    drawMarker(rightX, postNegY, successColor);
    drawLrLabel(lrNegY, "LR-", lrNegative, successColor, false);
  }

  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textAlign = "left";
  ctx.fillStyle = warmColor;
  ctx.fillRect(margin, displayHeight - 40, 15, 3);
  ctx.fillStyle = textColor;
  ctx.fillText("Positive test (LR+)", margin + 20, displayHeight - 36);

  ctx.fillStyle = successColor;
  ctx.fillRect(margin, displayHeight - 25, 15, 3);
  ctx.fillStyle = textColor;
  ctx.fillText("Negative test (LR-)", margin + 20, displayHeight - 21);
}
