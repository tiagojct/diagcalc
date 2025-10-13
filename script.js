const datasets = {
  screening: {
    tp: 42,
    fp: 58,
    fn: 18,
    tn: 882,
    preTestProb: 6,
  },
  caseControl: {
    tp: 92,
    fp: 18,
    fn: 8,
    tn: 82,
    preTestProb: 50,
  },
  clinic: {
    tp: 75,
    fp: 25,
    fn: 10,
    tn: 140,
    preTestProb: 40,
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("inputForm");
  const feedbackEl = document.getElementById("feedback");
  const resultsEl = document.getElementById("results");
  const datasetSelect = document.getElementById("datasetSelect");
  const resetButton = document.getElementById("resetButton");
  const probabilityChartEl = document.getElementById("probabilityChart");
  const printButton = document.getElementById("printButton");

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
    setFeedback("Cálculo concluído. Explore a interpretação abaixo.", true);
  });

  datasetSelect.addEventListener("change", () => {
    const selected = datasetSelect.value;
    if (!selected || !datasets[selected]) {
      return;
    }
    applyDataset(datasets[selected]);
    setFeedback("Cenário carregado. Ajuste os valores conforme necessário e calcule novamente.", true);
  });

  form.addEventListener("reset", () => {
    window.requestAnimationFrame(() => {
      resultsEl.innerHTML = "";
      datasetSelect.value = "";
      setFeedback("Campos limpos.", true);
      clearProbabilityChart(probabilityChartEl);
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

  function applyDataset({ tp, fp, fn, tn, preTestProb }) {
    document.getElementById("tp").value = tp;
    document.getElementById("fp").value = fp;
    document.getElementById("fn").value = fn;
    document.getElementById("tn").value = tn;
    document.getElementById("preTestProb").value = preTestProb;
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
