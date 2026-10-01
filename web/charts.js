// Browser-only drawing and redraw lifecycle. Numeric geometry stays in lib/.
window.DiagcalcCharts = (() => {
  function prepareCanvas(canvas) {
    if (!canvas) return null;
    const details = canvas.closest("details");
    if (details && !details.open) return null;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (width < 120 || height < 80) return null;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const dpr = window.devicePixelRatio || 1;
    const pixelWidth = Math.round(width * dpr);
    const pixelHeight = Math.round(height * dpr);
    if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
    if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    return { ctx, width, height };
  }

  function clearCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function createScheduler() {
    const drawings = new Map();
    let pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      window.requestAnimationFrame(() => {
        pending = false;
        for (const { draw, active } of drawings.values()) {
          if (active()) draw();
        }
      });
    }
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(schedule) : null;
    function register(canvas, draw, active) {
      if (!canvas) return;
      drawings.set(canvas, { draw, active });
      if (observer) observer.observe(canvas);
      const details = canvas.closest("details");
      if (details) details.addEventListener("toggle", schedule);
    }
    window.addEventListener("resize", schedule);
    window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
    return { register, schedule };
  }

  function drawROC(canvas, roc) {
    if (!canvas) return;
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width: W, height: H } = prepared;
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

    // Plot the user's data points + label each one with its cutoff value.
    // Labels are offset away from the curve's interior (above-left when the
    // point sits in the upper-right half-plane, below-right when in the
    // lower-left), so they stay clear of the line and of the diagonal.
    for (let i = 0; i < roc.points.length; i += 1) {
      const p = roc.points[i];
      const isOptimal = i === roc.optimalIndex;
      ctx.fillStyle = isOptimal ? warningColor : primaryColor;
      ctx.beginPath();
      ctx.arc(px(p.fpr), py(p.sens), isOptimal ? 7 : 4, 0, 2 * Math.PI);
      ctx.fill();

      const hasCutoff = p.cutoff !== null && p.cutoff !== undefined && p.cutoff !== "";
      if (!hasCutoff && !isOptimal) continue;
      const labelText = hasCutoff
        ? (typeof p.cutoff === "number" ? p.cutoff.toString() : String(p.cutoff))
        : "best";
      ctx.fillStyle = isOptimal ? textColor : mutedColor;
      ctx.font = isOptimal
        ? "10px 'JetBrains Mono', ui-monospace, monospace"
        : "9px 'JetBrains Mono', ui-monospace, monospace";
      // Place labels outside the curve: upper-left of high-FPR points
      // (which sit near the top-right of the plot), lower-right of the rest.
      // Keeps text off both the curve line and the chance diagonal.
      const upperHalf = p.fpr > 0.55;
      if (upperHalf) {
        ctx.textAlign = "right";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(labelText, px(p.fpr) - 8, py(p.sens) - 6);
      } else {
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(labelText, px(p.fpr) + 8, py(p.sens) + 14);
      }
    }

    // AUC label inside plot
    ctx.fillStyle = textColor;
    ctx.textAlign = "right";
    ctx.font = "12px 'JetBrains Mono', ui-monospace, monospace";
    ctx.fillText(`AUC = ${roc.auc.toFixed(3)}`, margin.left + plotW - 8, margin.top + plotH - 10);
  }

  function drawPrevalence(canvas, sens, spec, currentPrev) {
    if (!canvas || !Number.isFinite(sens) || !Number.isFinite(spec)) return;
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width: W, height: H } = prepared;
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
        const y = py(window.DiagcalcCore.clamp(v, 0, 1));
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

    const markerX = px(window.DiagcalcCore.clamp(currentPrev, 0, 1));
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

  function drawFagan(canvas, data) {
    const prepared = prepareCanvas(canvas);
    if (!prepared) return;
    const { ctx, width, height } = prepared;
    const geometry = window.DiagcalcGeometry;
    const core = window.DiagcalcCore;
    const styles = getComputedStyle(document.documentElement);
    const colour = (name) => styles.getPropertyValue(name).trim();
    const margin = Math.min(55, width * 0.16);
    const top = 50;
    const bottom = height - 65;
    const y = (position) => top + position * (bottom - top);
    const xs = [margin, width / 2, width - margin];
    ctx.strokeStyle = colour("--axis");
    ctx.fillStyle = colour("--text");
    ctx.font = "11px ui-monospace, monospace";
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i += 1) {
      ctx.beginPath(); ctx.moveTo(xs[i], top); ctx.lineTo(xs[i], bottom); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillText(["Pre-test", "LR", "Post-test"][i], xs[i], top - 20);
    }
    ctx.font = "9px ui-monospace, monospace";
    for (const probability of [0.001, 0.01, 0.1, 0.5, 0.9, 0.99, 0.999]) {
      ctx.textAlign = "right";
      ctx.fillText(core.formatPercentage(probability), xs[0] - 4, y(geometry.prePosition(probability)) + 3);
      ctx.textAlign = "left";
      ctx.fillText(core.formatPercentage(probability), xs[2] + 4, y(geometry.postPosition(probability)) + 3);
    }
    ctx.textAlign = "center";
    for (const lr of [0.001, 0.01, 0.1, 1, 10, 100, 1000]) {
      ctx.fillText(String(lr), xs[1], y(geometry.lrPosition(lr)) + 3);
    }
    const branches = [
      { lr: data.lrPositive, post: data.postPositive, label: "LR+", colour: colour("--accent-warm") },
      { lr: data.lrNegative, post: data.postNegative, label: "LR−", colour: colour("--success") },
    ];
    let offScale = false;
    for (const branch of branches) {
      const positions = geometry.faganCoordinates(data.preTest, branch.lr, branch.post);
      if (!positions.inRange) { offScale = true; continue; }
      ctx.strokeStyle = branch.colour;
      ctx.fillStyle = branch.colour;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(xs[0], y(positions.pre));
      ctx.lineTo(xs[2], y(positions.post));
      ctx.stroke();
      for (const [i, position] of [positions.pre, positions.lr, positions.post].entries()) {
        ctx.beginPath(); ctx.arc(xs[i], y(position), 3, 0, 2 * Math.PI); ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.fillText(`${branch.label} ${core.formatLikelihood(branch.lr)}`, xs[1] + 7, y(positions.lr) - 7);
    }
    ctx.fillStyle = colour("--text-muted");
    ctx.textAlign = "center";
    ctx.fillText("Pre-test odds × LR = post-test odds", width / 2, height - 35);
    if (offScale) ctx.fillText("Off-scale / undefined: see values above", width / 2, height - 16);
  }

  return { prepareCanvas, clearCanvas, createScheduler, drawROC, drawPrevalence, drawFagan };
})();
