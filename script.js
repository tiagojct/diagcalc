const datasets = {
  screening: {
    tp: 42,
    fp: 58,
    fn: 18,
    tn: 882,
    preTestProb: 6,
    name: "Programa de rastreio (prevalência baixa)",
    description: "Cenário genérico de rastreio populacional com baixa prevalência.",
    reference: null
  },
  caseControl: {
    tp: 92,
    fp: 18,
    fn: 8,
    tn: 82,
    preTestProb: 50,
    name: "Estudo caso-controlo",
    description: "Desenho caso-controlo típico com prevalência artificialmente equilibrada.",
    reference: null
  },
  clinic: {
    tp: 75,
    fp: 25,
    fn: 10,
    tn: 140,
    preTestProb: 40,
    name: "Clínica especializada",
    description: "Contexto de clínica especializada com prevalência intermédia.",
    reference: null
  },
  ddimer: {
    tp: 195,
    fp: 87,
    fn: 5,
    tn: 413,
    preTestProb: 28.6,
    name: "D-dímero para embolia pulmonar",
    description: "Wells score baixo + D-dímero para excluir embolia pulmonar em urgência.",
    reference: {
      authors: "Righini M, et al.",
      title: "Age-Adjusted D-Dimer Cutoff Levels to Rule Out Pulmonary Embolism",
      journal: "JAMA. 2014;311(11):1117-1124",
      doi: "10.1001/jama.2014.2135",
      url: "https://jamanetwork.com/journals/jama/fullarticle/1839153"
    }
  },
  troponin: {
    tp: 289,
    fp: 156,
    fn: 11,
    tn: 1544,
    preTestProb: 15,
    name: "Troponina ultrassensível para EAM",
    description: "Troponina de alta sensibilidade para diagnóstico de enfarte agudo do miocárdio.",
    reference: {
      authors: "Reichlin T, et al.",
      title: "Early Diagnosis of Myocardial Infarction with Sensitive Cardiac Troponin Assays",
      journal: "N Engl J Med. 2009;361(9):858-867",
      doi: "10.1056/NEJMoa0900428",
      url: "https://www.nejm.org/doi/full/10.1056/NEJMoa0900428"
    }
  },
  mammography: {
    tp: 7,
    fp: 93,
    fn: 3,
    tn: 897,
    preTestProb: 1,
    name: "Mamografia de rastreio",
    description: "Rastreio mamográfico em mulheres 50-69 anos (dados agregados).",
    reference: {
      authors: "Kopans DB, et al.",
      title: "Screening Mammography Performance Metrics",
      journal: "Radiology. 2020;297(2):239-240",
      doi: "10.1148/radiol.2020203635",
      url: "https://pubs.rsna.org/doi/10.1148/radiol.2020203635"
    }
  },
  covid_antigen: {
    tp: 103,
    fp: 8,
    fn: 47,
    tn: 192,
    preTestProb: 42.9,
    name: "Teste rápido antigénio COVID-19",
    description: "Teste rápido de antigénio para SARS-CoV-2 em sintomáticos (primeiros 7 dias).",
    reference: {
      authors: "Dinnes J, et al.",
      title: "Rapid, Point-of-Care Antigen Tests for COVID-19",
      journal: "Cochrane Database Syst Rev. 2022;7:CD013705",
      doi: "10.1002/14651858.CD013705.pub3",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD013705.pub3"
    }
  },
  hiv_elisa: {
    tp: 199,
    fp: 1,
    fn: 1,
    tn: 9799,
    preTestProb: 2,
    name: "ELISA para HIV",
    description: "Teste ELISA de 4ª geração para rastreio de HIV em população geral.",
    reference: {
      authors: "Masciotra S, et al.",
      title: "Performance of HIV Diagnostic Tests",
      journal: "J Clin Microbiol. 2013;51(6):1694-1700",
      doi: "10.1128/JCM.03552-12",
      url: "https://journals.asm.org/doi/10.1128/JCM.03552-12"
    }
  },
  strep_throat: {
    tp: 142,
    fp: 25,
    fn: 18,
    tn: 315,
    preTestProb: 32,
    name: "Teste rápido para Streptococcus",
    description: "Teste rápido para faringite estreptocócica em crianças com febre e odinofagia.",
    reference: {
      authors: "Cohen JF, et al.",
      title: "Rapid Antigen Detection Test for Group A Streptococcus in Children",
      journal: "Cochrane Database Syst Rev. 2016;7:CD010502",
      doi: "10.1002/14651858.CD010502.pub2",
      url: "https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.CD010502.pub2"
    }
  },
  xray_pneumonia: {
    tp: 168,
    fp: 82,
    fn: 32,
    tn: 318,
    preTestProb: 33.3,
    name: "Radiografia de tórax para pneumonia",
    description: "RX tórax para pneumonia adquirida na comunidade em adultos sintomáticos.",
    reference: {
      authors: "Hagaman JT, et al.",
      title: "Admission Chest Radiograph Lacks Sensitivity in Pneumonia",
      journal: "Am J Med Sci. 2009;337(4):236-240",
      doi: "10.1097/MAJ.0b013e31818ad805",
      url: "https://www.amjmedsci.org/"
    }
  }
};

document.addEventListener("DOMContentLoaded", () => {
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

  // Initialize theme
  initializeTheme();

  // Theme toggle
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = readFormValues();
    const validation = validateInputs(data);

    if (!validation.valid) {
      resultsEl.innerHTML = "";
      setFeedback(validation.message, false);
      clearProbabilityChart(probabilityChartEl);
      return;
    }

    const metrics = calculateMetrics(data);
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
    setFeedback("Cálculo concluído. Explore a interpretação abaixo.", true);
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
    setFeedback("Cenário carregado. Ajuste os valores conforme necessário e calcule novamente.", true);
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      resultsEl.innerHTML = "";
      datasetSelect.value = "";
      datasetReferenceEl.style.display = "none";
      setFeedback("Campos limpos.", true);
      clearProbabilityChart(probabilityChartEl);
      if (faganNomogramEl) {
        faganNomogramEl.style.display = "none";
      }
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
    const preTestValue = normaliseDecimal(preTestField.value);
    return {
      tp: safeParseInt(document.getElementById("tp").value),
      fp: safeParseInt(document.getElementById("fp").value),
      fn: safeParseInt(document.getElementById("fn").value),
      tn: safeParseInt(document.getElementById("tn").value),
      preTestProb: preTestValue === "" ? NaN : parseFloat(preTestValue),
    };
  }

  function validateInputs({ tp, fp, fn, tn, preTestProb }) {
    const inputs = [tp, fp, fn, tn];
    if (inputs.some((value) => Number.isNaN(value) || value < 0)) {
      return { valid: false, message: "Introduza números inteiros iguais ou superiores a zero." };
    }

    if (Number.isNaN(preTestProb)) {
      return { valid: false, message: "Indique uma probabilidade pré-teste válida." };
    }

    if (preTestProb < 0 || preTestProb >= 100) {
      return { valid: false, message: "A probabilidade pré-teste deve estar entre 0 e 99,9%." };
    }

    if (tp + fn === 0) {
      return { valid: false, message: "Sensibilidade indeterminada: adicione casos com doença (TP ou FN)." };
    }

    if (tn + fp === 0) {
      return { valid: false, message: "Especificidade indeterminada: adicione casos sem doença (TN ou FP)." };
    }

    if (tp + fp === 0) {
      return { valid: false, message: "VPP indeterminado: é necessário pelo menos um teste positivo." };
    }

    if (tn + fn === 0) {
      return { valid: false, message: "VPN indeterminado: é necessário pelo menos um teste negativo." };
    }

    return { valid: true };
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

function calculateMetrics({ tp, fp, fn, tn, preTestProb }) {
  const totals = {
    diseased: tp + fn,
    nonDiseased: tn + fp,
    positives: tp + fp,
    negatives: tn + fn,
  };

  const preTest = preTestProb / 100;
  const sensitivity = tp / totals.diseased;
  const specificity = tn / totals.nonDiseased;
  const ppv = tp / totals.positives;
  const npv = tn / totals.negatives;

  const lrPositive = calculateRatio(sensitivity, 1 - specificity);
  const lrNegative = calculateRatio(1 - sensitivity, specificity);

  const preTestOdds = calculateOdds(preTest);
  const postTestOddsPositive = multiplyOdds(preTestOdds, lrPositive);
  const postTestOddsNegative = multiplyOdds(preTestOdds, lrNegative);

  const postTestProbPositive = probabilityFromOdds(postTestOddsPositive);
  const postTestProbNegative = probabilityFromOdds(postTestOddsNegative);

  return {
    sensitivity: {
      label: "Sensibilidade",
      value: sensitivity,
      ci: calcWilsonInterval(tp, totals.diseased),
      note: buildSensitivityNote(sensitivity),
    },
    specificity: {
      label: "Especificidade",
      value: specificity,
      ci: calcWilsonInterval(tn, totals.nonDiseased),
      note: buildSpecificityNote(specificity),
    },
    ppv: {
      label: "Valor preditivo positivo",
      value: ppv,
      ci: calcWilsonInterval(tp, totals.positives),
      note: "Probabilidade de doença após um resultado positivo.",
    },
    npv: {
      label: "Valor preditivo negativo",
      value: npv,
      ci: calcWilsonInterval(tn, totals.negatives),
      note: "Probabilidade de ausência de doença após um resultado negativo.",
    },
    lrPositive: {
      label: "Likelihood ratio positivo (LR+)",
      value: lrPositive,
      formatter: formatLikelihood,
      note: interpretLRPositive(lrPositive),
    },
    lrNegative: {
      label: "Likelihood ratio negativo (LR-)",
      value: lrNegative,
      formatter: formatLikelihood,
      note: interpretLRNegative(lrNegative),
    },
    preTestProbability: {
      label: "Probabilidade pré-teste",
      value: preTest,
      note: "Ponto de partida estimado antes do resultado do teste.",
    },
    postTestPositive: {
      label: "Probabilidade pós-teste (resultado positivo)",
      value: postTestProbPositive,
      note: "Atualiza a probabilidade de doença após um teste positivo.",
    },
    postTestNegative: {
      label: "Probabilidade pós-teste (resultado negativo)",
      value: postTestProbNegative,
      note: "Atualiza a probabilidade de doença após um teste negativo.",
    },
  };
}

function renderResults(container, metrics) {
  container.innerHTML = "";
  const entries = Object.entries(metrics);
  entries.forEach(([key, data]) => {
    const card = document.createElement("article");
    card.className = "result-card";

    const title = document.createElement("h3");
    title.textContent = data.label;
    card.appendChild(title);

    const value = document.createElement("p");
    value.className = "result-value";
    value.textContent = formatValue(data.value, data.formatter);
    card.appendChild(value);

    if (data.ci) {
      const ci = document.createElement("p");
      ci.className = "result-ci";
      ci.textContent = `IC 95%: ${formatPercentage(data.ci.lower)} – ${formatPercentage(data.ci.upper)}`;
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
    { label: "Pré-teste", value: values.pre, variant: "baseline" },
    { label: "Pós-teste (+)", value: values.postPositive, variant: "positive" },
    { label: "Pós-teste (-)", value: values.postNegative, variant: "negative" },
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
  const safeValue = Number.isFinite(value) ? clamp(value, 0, 1) : 0;
  fill.style.transform = `scaleX(${safeValue})`;

  const valueEl = document.createElement("span");
  valueEl.className = "chart-value";
  valueEl.textContent = formatPercentage(value);

  bar.appendChild(fill);
  row.appendChild(labelEl);
  row.appendChild(bar);
  row.appendChild(valueEl);

  return row;
}

function safeParseInt(value) {
  if (typeof value !== "string") {
    return NaN;
  }
  const trimmed = value.trim();
  if (trimmed === "") {
    return NaN;
  }
  return parseInt(trimmed, 10);
}

function calcWilsonInterval(successes, total) {
  if (total === 0) {
    return null;
  }

  const z = 1.96;
  const phat = successes / total;
  const denominator = 1 + (z ** 2) / total;
  const center = phat + (z ** 2) / (2 * total);
  const margin = z * Math.sqrt((phat * (1 - phat) + (z ** 2) / (4 * total)) / total);
  const lower = Math.max(0, (center - margin) / denominator);
  const upper = Math.min(1, (center + margin) / denominator);
  return { lower, upper };
}

function calculateRatio(numerator, denominator) {
  if (denominator === 0) {
    return Infinity;
  }
  if (numerator === 0) {
    return 0;
  }
  return numerator / denominator;
}

function calculateOdds(probability) {
  if (probability === 1) {
    return Infinity;
  }
  if (probability === 0) {
    return 0;
  }
  return probability / (1 - probability);
}

function multiplyOdds(odds, ratio) {
  if (!Number.isFinite(odds) || !Number.isFinite(ratio)) {
    if (odds === 0 || ratio === 0) {
      return 0;
    }
    if (odds === Infinity || ratio === Infinity) {
      return Infinity;
    }
  }
  return odds * ratio;
}

function probabilityFromOdds(odds) {
  if (odds === Infinity) {
    return 1;
  }
  if (odds === 0) {
    return 0;
  }
  return odds / (1 + odds);
}

function formatValue(value, customFormatter) {
  if (typeof customFormatter === "function") {
    return customFormatter(value);
  }
  return formatPercentage(value);
}

function formatPercentage(value) {
  if (!Number.isFinite(value)) {
    return "—";
  }
  return `${(value * 100).toFixed(1)}%`;
}

function normaliseDecimal(value) {
  if (typeof value !== "string") {
    return "";
  }
  return value.replace(",", ".").trim();
}

function formatLikelihood(value) {
  if (!Number.isFinite(value)) {
    return "∞";
  }
  if (value === 0) {
    return "0";
  }
  return value >= 10 ? value.toFixed(1) : value.toFixed(2);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function buildSensitivityNote(value) {
  if (value >= 0.9) {
    return "Capta a maioria dos casos com doença. Útil para rastreios.";
  }
  if (value >= 0.7) {
    return "Sensibilidade moderada: avalie em conjunto com o contexto clínico.";
  }
  return "Sensibilidade baixa: considere testes adicionais para reduzir falsos negativos.";
}

function buildSpecificityNote(value) {
  if (value >= 0.9) {
    return "Poucos falsos positivos. Adequado para confirmar diagnósticos.";
  }
  if (value >= 0.7) {
    return "Especificidade moderada: confirme com outros dados laboratoriais ou clínicos.";
  }
  return "Especificidade baixa: atenção a falsos positivos e impacto nas decisões terapêuticas.";
}

function interpretLRPositive(value) {
  if (!Number.isFinite(value)) {
    return "LR+ muito elevado: resultado positivo praticamente confirma a doença.";
  }
  if (value >= 10) {
    return "LR+ ≥ 10 indica forte evidência a favor da doença.";
  }
  if (value >= 5) {
    return "LR+ moderado: aumenta substancialmente a probabilidade de doença.";
  }
  if (value >= 2) {
    return "LR+ baixo: ganho limitado; combine com outros dados.";
  }
  return "LR+ próximo de 1: resultado positivo pouco altera a probabilidade de doença.";
}

function interpretLRNegative(value) {
  if (!Number.isFinite(value)) {
    return "LR- infinito: resultado negativo não reduz a probabilidade de doença.";
  }
  if (value <= 0.1) {
    return "LR- ≤ 0,1 indica forte evidência contra a doença.";
  }
  if (value <= 0.2) {
    return "LR- moderado: reduz a probabilidade de doença.";
  }
  if (value <= 0.5) {
    return "LR- baixo: pouco impacto, considere avaliação adicional.";
  }
  return "LR- próximo de 1: resultado negativo não exclui a doença.";
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
  if (toggle) {
    const icon = toggle.querySelector(".theme-icon");
    if (icon) {
      icon.textContent = theme === "dark" ? "☀" : "◐";
    }
  }
}

// Dataset Reference Display
function displayDatasetReference(dataset) {
  const referenceEl = document.getElementById("dataset-reference");
  if (!referenceEl) return;

  if (!dataset.reference) {
    referenceEl.style.display = "none";
    return;
  }

  const ref = dataset.reference;
  referenceEl.innerHTML = `
    <h4>📚 Referência</h4>
    <p><strong>${dataset.description}</strong></p>
    <p class="reference-citation">
      ${ref.authors} ${ref.title}. <em>${ref.journal}</em>. 
      <a href="${ref.url}" target="_blank" rel="noopener noreferrer">DOI: ${ref.doi}</a>
    </p>
  `;
  referenceEl.style.display = "block";
}

// Fagan Nomogram Rendering
function renderFaganNomogram(canvas, container, data) {
  if (!canvas || !container) return;

  const { preTest, lrPositive, lrNegative, postPositive, postNegative } = data;

  if (!Number.isFinite(preTest) || !Number.isFinite(lrPositive)) {
    container.style.display = "none";
    return;
  }

  container.style.display = "block";
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;

  // Adjust for device pixel ratio
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const displayWidth = rect.width;
  const displayHeight = rect.height;

  // Clear canvas
  ctx.clearRect(0, 0, displayWidth, displayHeight);

  // Define scales
  const margin = 60;
  const colWidth = (displayWidth - 2 * margin) / 3;
  const scaleHeight = displayHeight - 2 * margin;

  // Helper: probability to y position (logit scale)
  function probToY(prob) {
    const clampedProb = Math.max(0.001, Math.min(0.999, prob));
    const logit = Math.log(clampedProb / (1 - clampedProb));
    const minLogit = Math.log(0.001 / 0.999);
    const maxLogit = Math.log(0.999 / 0.001);
    const normalized = (logit - minLogit) / (maxLogit - minLogit);
    return margin + scaleHeight * (1 - normalized);
  }

  // Helper: LR to y position (log scale)
  function lrToY(lr) {
    const clampedLR = Math.max(0.01, Math.min(1000, lr));
    const logLR = Math.log10(clampedLR);
    const minLog = Math.log10(0.01);
    const maxLog = Math.log10(1000);
    const normalized = (logLR - minLog) / (maxLog - minLog);
    return margin + scaleHeight * (1 - normalized);
  }

  // Draw axes
  ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--base-600').trim();
  ctx.lineWidth = 2;

  // Left axis (pre-test probability)
  const leftX = margin;
  ctx.beginPath();
  ctx.moveTo(leftX, margin);
  ctx.lineTo(leftX, margin + scaleHeight);
  ctx.stroke();

  // Middle axis (likelihood ratio)
  const middleX = margin + colWidth * 1.5;
  ctx.beginPath();
  ctx.moveTo(middleX, margin);
  ctx.lineTo(middleX, margin + scaleHeight);
  ctx.stroke();

  // Right axis (post-test probability)
  const rightX = margin + colWidth * 3;
  ctx.beginPath();
  ctx.moveTo(rightX, margin);
  ctx.lineTo(rightX, margin + scaleHeight);
  ctx.stroke();

  // Labels
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
  ctx.font = "bold 12px Inter, sans-serif";
  ctx.textAlign = "center";
  
  ctx.fillText("Pré-teste", leftX, margin - 30);
  ctx.fillText("LR", middleX, margin - 30);
  ctx.fillText("Pós-teste", rightX, margin - 30);

  // Draw scale markers
  ctx.font = "10px Inter, sans-serif";
  ctx.textAlign = "right";
  
  // Pre-test markers
  [0.1, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99].forEach(p => {
    const y = probToY(p / 100);
    ctx.fillText(`${p}%`, leftX - 5, y + 3);
  });

  // LR markers
  ctx.textAlign = "center";
  [0.01, 0.1, 0.2, 0.5, 1, 2, 5, 10, 100, 1000].forEach(lr => {
    const y = lrToY(lr);
    ctx.fillText(lr >= 1 ? lr : lr.toFixed(2), middleX, y + 3);
  });

  // Post-test markers
  ctx.textAlign = "left";
  [0.1, 1, 5, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99].forEach(p => {
    const y = probToY(p / 100);
    ctx.fillText(`${p}%`, rightX + 5, y + 3);
  });

  // Draw connecting lines
  const preY = probToY(preTest);
  
  // Positive LR line
  if (Number.isFinite(lrPositive) && lrPositive > 0) {
    const lrPosY = lrToY(lrPositive);
    const postPosY = probToY(postPositive);
    
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-warm').trim();
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(leftX, preY);
    ctx.lineTo(middleX, lrPosY);
    ctx.lineTo(rightX, postPosY);
    ctx.stroke();
    
    // Draw circles at endpoints
    ctx.setLineDash([]);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-warm').trim();
    ctx.beginPath();
    ctx.arc(leftX, preY, 5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(rightX, postPosY, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Negative LR line
  if (Number.isFinite(lrNegative) && lrNegative > 0) {
    const lrNegY = lrToY(lrNegative);
    const postNegY = probToY(postNegative);
    
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(leftX, preY);
    ctx.lineTo(middleX, lrNegY);
    ctx.lineTo(rightX, postNegY);
    ctx.stroke();
    
    // Draw circles at endpoints
    ctx.setLineDash([]);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
    ctx.beginPath();
    ctx.arc(rightX, postNegY, 5, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Legend
  ctx.font = "11px Inter, sans-serif";
  ctx.textAlign = "left";
  
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-warm').trim();
  ctx.fillRect(margin, displayHeight - 40, 15, 3);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
  ctx.fillText("Teste positivo (LR+)", margin + 20, displayHeight - 36);
  
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--success-color').trim();
  ctx.fillRect(margin, displayHeight - 25, 15, 3);
  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim();
  ctx.fillText("Teste negativo (LR-)", margin + 20, displayHeight - 21);
}
