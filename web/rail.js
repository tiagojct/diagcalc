// Probability rail: the single signature interaction. This module renders
// optional/undefined values honestly and keeps the active result between
// calculations and language changes.
window.DiagcalcRail = (() => {
  let activeResult = "positive";
  let onChange = null;
  const ticks = [0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  function position(probability) {
    const value = window.DiagcalcGeometry.prePosition(probability);
    if (Number.isFinite(value)) return clamp(value, 0, 1);
    return probability <= 0 ? 0 : 1;
  }

  function axisLabel(probability) {
    if (probability < 0.01) return `${(probability * 100).toFixed(1)}%`;
    if (probability < 0.1) return `${(probability * 100).toFixed(0)}%`;
    if (probability === 0.5) return "50%";
    return `${(probability * 100).toFixed(0)}%`;
  }

  function t(key, vars) {
    return window.DiagcalcI18n.t(key, vars);
  }

  function percent(value) {
    return window.DiagcalcCore.formatPercentage(value);
  }

  function likelihood(value) {
    return window.DiagcalcCore.formatLikelihood(value);
  }

  function metricFor(metrics, result) {
    return result === "positive" ? metrics.postTestPositive : metrics.postTestNegative;
  }

  function lrFor(metrics, result) {
    return result === "positive" ? metrics.lrPositive.value : metrics.lrNegative.value;
  }

  function build(container, metrics) {
    container.replaceChildren();
    const activeMetric = metricFor(metrics, activeResult);
    const inactiveResult = activeResult === "positive" ? "negative" : "positive";
    const inactiveMetric = metricFor(metrics, inactiveResult);
    const post = activeMetric ? activeMetric.value : NaN;
    const lr = lrFor(metrics, activeResult);
    const pre = metrics.preTestProbability.value;
    const available = Number.isFinite(post);
    const ci = available ? activeMetric.ci : null;
    const resultLabel = activeResult === "positive" ? t("rail.positive") : t("rail.negative");
    const lrLabel = activeResult === "positive" ? "LR+" : "LR−";

    const wrapper = document.createElement("section");
    wrapper.className = `probability-rail${available ? "" : " probability-rail--unavailable"}`;
    wrapper.dataset.result = activeResult;
    wrapper.setAttribute("aria-label", t("rail.post"));

    const controls = document.createElement("div");
    controls.className = "rail-controls";
    controls.setAttribute("role", "group");
    controls.setAttribute("aria-label", t("rail.post"));
    for (const result of ["positive", "negative"]) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "rail-toggle";
      button.dataset.result = result;
      button.textContent = result === "positive" ? t("rail.positive") : t("rail.negative");
      button.setAttribute("aria-pressed", String(result === activeResult));
      button.addEventListener("click", () => {
        if (activeResult === result) return;
        activeResult = result;
        if (onChange) onChange(activeResult);
        build(container, metrics);
      });
      controls.appendChild(button);
    }
    wrapper.appendChild(controls);

    const body = document.createElement("div");
    body.className = "rail-body";

    const track = document.createElement("div");
    track.className = "rail-track";
    track.setAttribute("role", "img");
    track.setAttribute(
      "aria-label",
      available
        ? t("rail.aria", {
          result: resultLabel,
          pre: percent(pre),
          lr: likelihood(lr),
          post: percent(post),
          lower: ci ? percent(ci.lower) : "—",
          upper: ci ? percent(ci.upper) : "—",
        })
        : t("rail.aria.unavailable", { result: resultLabel, pre: percent(pre) })
    );
    track.setAttribute("aria-describedby", "railReadout");

    const axis = document.createElement("div");
    axis.className = "rail-axis";
    track.appendChild(axis);

    const tickLayer = document.createElement("div");
    tickLayer.className = "rail-ticks";
    for (const tick of ticks) {
      const mark = document.createElement("span");
      mark.className = "rail-tick";
      mark.style.left = `${position(tick) * 100}%`;
      mark.dataset.probability = String(tick);
      mark.textContent = axisLabel(tick);
      tickLayer.appendChild(mark);
    }
    track.appendChild(tickLayer);

    if (Number.isFinite(pre)) {
      const preMark = document.createElement("span");
      preMark.className = "rail-marker rail-marker--pre";
      preMark.style.left = `${position(pre) * 100}%`;
      const preLabel = document.createElement("span");
      preLabel.className = "rail-marker-label";
      preLabel.textContent = `${t("rail.pre")} ${percent(pre)}`;
      preMark.appendChild(preLabel);
      track.appendChild(preMark);
    }

    if (available) {
      const line = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      line.setAttribute("class", "rail-line");
      line.setAttribute("viewBox", "0 0 100 100");
      line.setAttribute("preserveAspectRatio", "none");
      const stroke = document.createElementNS("http://www.w3.org/2000/svg", "line");
      stroke.setAttribute("x1", String(position(pre) * 100));
      stroke.setAttribute("y1", "50");
      stroke.setAttribute("x2", String(position(post) * 100));
      stroke.setAttribute("y2", "50");
      stroke.setAttribute("pathLength", "1");
      stroke.setAttribute("vector-effect", "non-scaling-stroke");
      line.appendChild(stroke);
      track.appendChild(line);

      const postMark = document.createElement("span");
      postMark.className = "rail-marker rail-marker--post";
      postMark.style.left = `${position(post) * 100}%`;
      const postLabel = document.createElement("span");
      postLabel.className = "rail-marker-label";
      postLabel.textContent = `${t("rail.post")} ${percent(post)}`;
      postMark.appendChild(postLabel);
      track.appendChild(postMark);

      if (ci && Number.isFinite(ci.lower) && Number.isFinite(ci.upper)) {
        const lower = position(ci.lower);
        const upper = position(ci.upper);
        const bracket = document.createElement("span");
        bracket.className = `rail-ci${ci.corrected ? " rail-ci--corrected" : ""}`;
        bracket.style.left = `${Math.min(lower, upper) * 100}%`;
        bracket.style.width = `${Math.max(0.6, Math.abs(upper - lower) * 100)}%`;
        bracket.title = ci.corrected ? t("rail.corrected") : "95% CI";
        track.appendChild(bracket);
      }
    } else {
      const unavailable = document.createElement("span");
      unavailable.className = "rail-unavailable";
      unavailable.textContent = t("rail.unavailable");
      track.appendChild(unavailable);
    }

    // The inactive endpoint stays visible as a faint reference. It makes the
    // positive/negative flip legible without turning the rail into two charts.
    if (inactiveMetric && Number.isFinite(inactiveMetric.value)) {
      const inactive = document.createElement("span");
      inactive.className = "rail-marker rail-marker--inactive";
      inactive.style.left = `${position(inactiveMetric.value) * 100}%`;
      inactive.title = `${activeResult === "positive" ? t("rail.negative") : t("rail.positive")} ${percent(inactiveMetric.value)}`;
      track.appendChild(inactive);
    }

    body.appendChild(track);
    wrapper.appendChild(body);

    const readout = document.createElement("div");
    readout.className = "rail-readout";
    readout.id = "railReadout";
    const preValue = document.createElement("span");
    preValue.className = "rail-readout-item";
    preValue.innerHTML = `<span class="rail-readout-label">${t("rail.pre")}</span>${percent(pre)}`;
    const times = document.createElement("span");
    times.className = "rail-readout-op";
    times.textContent = "×";
    const lrValue = document.createElement("span");
    lrValue.className = "rail-readout-item";
    lrValue.innerHTML = `<span class="rail-readout-label">${lrLabel}</span>${likelihood(lr)}`;
    const arrow = document.createElement("span");
    arrow.className = "rail-readout-op";
    arrow.textContent = "→";
    const postValue = document.createElement("span");
    postValue.className = "rail-readout-item rail-readout-post";
    postValue.innerHTML = `<span class="rail-readout-label">${t("rail.post")}</span>${available ? percent(post) : "—"}`;
    readout.append(preValue, times, lrValue, arrow, postValue);
    wrapper.appendChild(readout);

    const ciLabel = document.createElement("p");
    ciLabel.className = "rail-ci-label";
    if (ci) {
      ciLabel.textContent = `95% CI ${percent(ci.lower)} – ${percent(ci.upper)}${ci.corrected ? ` · ${t("rail.corrected")}` : ""}`;
    } else {
      ciLabel.textContent = t("rail.formula");
    }
    wrapper.appendChild(ciLabel);

    container.appendChild(wrapper);
  }

  function render(container, metrics) {
    if (!container || !metrics) return;
    build(container, metrics);
  }

  function getActiveResult() {
    return activeResult;
  }

  function setOnChange(callback) {
    onChange = typeof callback === "function" ? callback : null;
  }

  return { render, getActiveResult, setOnChange };
})();
