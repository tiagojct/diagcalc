document.addEventListener("DOMContentLoaded", () => {
  const core = window.DiagcalcCore;
  const datasetStore = window.DiagcalcDatasets;
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

  const datasets = datasetStore.datasets;
  const form = document.getElementById("inputForm");
  const resultsEl = document.getElementById("results");
  const datasetSelect = document.getElementById("datasetSelect");
  const resetButton = document.getElementById("resetButton");
  const probabilityChartEl = document.getElementById("probabilityChart");
  const biasWarningsEl = document.getElementById("biasWarnings");
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
      return;
    }

    const dataset = datasets[selected];
    applyDataset(dataset);
    displayDatasetReference(dataset);
    setFeedback("Scenario loaded. Adjust the values as needed and recalculate.", true);
    calculateAndRender();
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      resultsEl.innerHTML = "";
      datasetSelect.value = "";
      datasetReferenceEl.style.display = "none";
      setFeedback("Fields cleared.", true);
      clearProbabilityChart(probabilityChartEl);
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
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
      resultsEl.innerHTML = "";
      setFeedback(validation.message, false);
      clearProbabilityChart(probabilityChartEl);
      clearFaganNomogram(faganNomogramEl, faganCanvas);
      hidePrevalenceExplorer();
      hideSequentialTest();
      hideThresholdPanel();
      renderBiasWarnings([]);
      return;
    }

    const metrics = core.calculateMetrics(data);
    renderBiasWarnings(core.buildBiasWarnings(data));
    renderResults(resultsEl, metrics);
    renderProbabilityChart(probabilityChartEl, {
      pre: metrics.preTestProbability.value,
      postPositive: metrics.postTestPositive.value,
      postNegative: metrics.postTestNegative.value,
    });
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
    setFeedback("Calculation complete. Explore the interpretation guide below.", true);
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

    const metrics = core.calculateMetrics(input);
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
    const axisColor = styles.getPropertyValue("--base-600").trim();
    const textColor = styles.getPropertyValue("--text-color").trim();
    const ppvColor = styles.getPropertyValue("--accent-warm").trim();
    const npvColor = styles.getPropertyValue("--success-color").trim();
    const primaryColor = styles.getPropertyValue("--primary-color").trim();
    const mutedColor = styles.getPropertyValue("--muted-text").trim();

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

function renderResults(container, metrics) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  const entries = Object.entries(metrics);
  entries.forEach(([, data]) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = document.createElement("h3");
    title.textContent = data.label;
    card.appendChild(title);

    const value = document.createElement("p");
    value.className = "result-value";
    value.textContent = window.DiagcalcCore.formatValue(data.value, data.formatter);
    card.appendChild(value);

    if (data.ci) {
      const ci = document.createElement("p");
      ci.className = "result-ci";
      const fmt = window.DiagcalcCore.formatValue;
      ci.textContent = `95% CI: ${fmt(data.ci.lower, data.formatter)} – ${fmt(data.ci.upper, data.formatter)}`;
      card.appendChild(ci);
    }

    if (data.note) {
      const note = document.createElement("p");
      note.className = "result-note";
      note.textContent = data.note;
      card.appendChild(note);
    }

    container.appendChild(card);
  });
}

function renderProbabilityChart(container, values) {
  if (!container) {
    return;
  }

  container.innerHTML = "";
  container.setAttribute("role", "list");

  const rows = [
    { label: "Pre-test", value: values.pre, variant: "baseline" },
    { label: "Post-test (+)", value: values.postPositive, variant: "positive" },
    { label: "Post-test (-)", value: values.postNegative, variant: "negative" },
  ];

  rows.forEach((row) => {
    container.appendChild(createChartRow(row));
  });
}

function clearProbabilityChart(container) {
  if (container) {
    container.innerHTML = "";
    container.removeAttribute("role");
  }
}

function createChartRow({ label, value, variant }) {
  const row = document.createElement("div");
  row.className = "chart-row";
  row.setAttribute("role", "listitem");

  const labelEl = document.createElement("span");
  labelEl.className = "chart-label";
  labelEl.textContent = label;

  const bar = document.createElement("div");
  bar.className = "chart-bar";

  const fill = document.createElement("span");
  fill.className = "chart-fill";
  if (variant === "positive") {
    fill.classList.add("positive");
  } else if (variant === "negative") {
    fill.classList.add("negative");
  }
  const safeValue = Number.isFinite(value) ? window.DiagcalcCore.clamp(value, 0, 1) : 0;
  fill.style.transform = `scaleX(${safeValue})`;

  const valueEl = document.createElement("span");
  valueEl.className = "chart-value";
  valueEl.textContent = window.DiagcalcCore.formatPercentage(value);

  bar.appendChild(fill);
  row.appendChild(labelEl);
  row.appendChild(bar);
  row.appendChild(valueEl);

  return row;
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
  const axisColor = styles.getPropertyValue("--base-600").trim();
  const textColor = styles.getPropertyValue("--text-color").trim();
  const warmColor = styles.getPropertyValue("--accent-warm").trim();
  const successColor = styles.getPropertyValue("--success-color").trim();

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
