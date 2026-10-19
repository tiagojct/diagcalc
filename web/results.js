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
    card.appendChild(renderInlineBar(metric.value, o.barVariant, metric.label));
  } else if (o.band) {
    card.appendChild(renderBand(metric, o.band));
  }

  if (metric.ci) {
    const ci = document.createElement("p");
    ci.className = "result-ci";
    const fmt = window.DiagcalcCore.formatValue;
    ci.textContent = window.DiagcalcI18n.t(metric.ci.corrected ? "ci.corrected" : "ci", { lower: fmt(metric.ci.lower, metric.formatter), upper: fmt(metric.ci.upper, metric.formatter) });
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
function renderInlineBar(value, variant, label) {
  const wrap = document.createElement("div");
  wrap.className = "result-bar";
  if (variant) wrap.classList.add(`result-bar--${variant}`);
  if (!Number.isFinite(value)) {
    wrap.classList.add("result-bar--unavailable");
    wrap.setAttribute("role", "img");
    wrap.setAttribute("aria-label", window.DiagcalcI18n.t("bar.aria.unavailable", { metric: label || "" }));
    return wrap;
  }
  const fill = document.createElement("span");
  fill.className = "result-bar-fill";
  const pct = Math.min(100, Math.max(0, value * 100));
  fill.style.width = `${pct}%`;
  wrap.appendChild(fill);
  wrap.setAttribute("role", "img");
  wrap.setAttribute("aria-label", window.DiagcalcI18n.t("bar.aria", { percent: pct.toFixed(1) }));
  return wrap;
}

// 4-segment clinical-utility band with a marker at the value's position.
const BAND_DEFS = {
  "lr-plus":  { stops: [0, 2, 5, 10, 100],     labels: ["weak", "limited", "useful", "rule-in"] },
  "lr-minus": { stops: [0, 0.1, 0.2, 0.5, 1],  labels: ["rule-out", "useful", "limited", "weak"] },
  "dor":      { stops: [0, 1, 10, 100, 1000],  labels: ["poor", "limited", "useful", "very strong"] },
};

function bandPosition(value, stops) {
  if (Number.isNaN(value)) return null;
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
  const sourceDef = BAND_DEFS[kind];
  const def = sourceDef ? { ...sourceDef, labels: sourceDef.labels.map((label) => window.DiagcalcI18n.text(label)) } : null;
  if (!def) return document.createComment(`unknown band: ${kind}`);
  const pos = bandPosition(metric.value, def.stops);
  const wrap = document.createElement("div");
  wrap.className = `result-band result-band--${kind}`;
  wrap.setAttribute("role", "img");
  if (pos === null) {
    wrap.classList.add("result-band--unavailable");
    wrap.setAttribute("aria-label", window.DiagcalcI18n.t("band.aria.unavailable", { metric: metric.label }));
    return wrap;
  }

  for (let i = 0; i < def.labels.length; i += 1) {
    const zone = document.createElement("span");
    zone.className = `result-band-zone result-band-zone--${i}`;
    zone.setAttribute("title", def.labels[i]);
    wrap.appendChild(zone);
  }

  const marker = document.createElement("span");
  marker.className = "result-band-marker";
  marker.style.left = `${pos}%`;
  wrap.appendChild(marker);

  // Underlying tier labels — visible on hover via CSS, always read by AT.
  const ariaTier = def.labels[Math.min(def.labels.length - 1, Math.floor(pos / (100 / def.labels.length)))] || def.labels[0];
  wrap.setAttribute("aria-label", window.DiagcalcI18n.t("band.aria", { metric: metric.label, tier: ariaTier }));

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
  if (!window.DiagcalcRail) {
    container.textContent = window.DiagcalcI18n.t("rail.unavailable");
    return;
  }
  window.DiagcalcRail.render(container, metrics);
}

// Compat: still used by the chained-test panel which uses a simple grid.
function renderResults(container, metrics) {
  if (!container) return;
  container.innerHTML = "";
  for (const [, data] of Object.entries(metrics)) {
    container.appendChild(renderMetricCard(data, { size: "sm" }));
  }
}

