document.addEventListener("DOMContentLoaded", () => {
  const core = window.DiagcalcCore;
  const datasetStore = window.DiagcalcDatasets;

  if (!core || !datasetStore) {
    return;
  }

  const datasets = datasetStore.datasets;
  const form = document.getElementById("inputForm");
  const feedbackEl = document.getElementById("feedback");
  const resultsEl = document.getElementById("results");
  const datasetSelect = document.getElementById("datasetSelect");
  const resetButton = document.getElementById("resetButton");
  const probabilityChartEl = document.getElementById("probabilityChart");
  const printButton = document.getElementById("printButton");
  const datasetReferenceEl = document.getElementById("dataset-reference");
  const themeToggle = document.getElementById("themeToggle");
  const faganNomogramEl = document.getElementById("faganNomogram");
  const faganCanvas = document.getElementById("faganCanvas");

  initializeTheme();

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      toggleTheme();
      redrawFaganNomogram();
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
      return;
    }

    const metrics = core.calculateMetrics(data);
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
    setFeedback("Calculation complete. Explore the interpretation guide below.", true);
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
      ci.textContent = `95% CI: ${window.DiagcalcCore.formatPercentage(data.ci.lower)} - ${window.DiagcalcCore.formatPercentage(data.ci.upper)}`;
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

  if (!canvas) {
    return;
  }

  const context = canvas.getContext("2d");
  if (context) {
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
  }
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

  if (Number.isFinite(lrNegative) && lrNegative > 0) {
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
