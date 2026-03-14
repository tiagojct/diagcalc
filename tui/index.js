const fs = require("fs");
const path = require("path");
const blessed = require("blessed");
const core = require("../lib/diagcalc-core");
const datasetStore = require("../lib/diagcalc-datasets");

function renderResults(metrics) {
  const performance = [
    renderMetricLine(metrics.sensitivity, "sensitivity"),
    renderMetricLine(metrics.specificity, "specificity"),
    renderMetricLine(metrics.ppv, "ppv"),
    renderMetricLine(metrics.npv, "npv"),
  ];

  const bayes = [
    renderMetricLine(metrics.lrPositive, "lrPositive"),
    renderMetricLine(metrics.lrNegative, "lrNegative"),
    renderMetricLine(metrics.preTestProbability, "neutral"),
    renderMetricLine(metrics.postTestPositive, "postPositive"),
    renderMetricLine(metrics.postTestNegative, "postNegative"),
  ];

  const bars = [
    `Pre-test      [${core.buildProbabilityBar(metrics.preTestProbability.value, 24)}] ${core.formatPercentage(metrics.preTestProbability.value)}`,
    `Post-test (+) [${core.buildProbabilityBar(metrics.postTestPositive.value, 24)}] ${core.formatPercentage(metrics.postTestPositive.value)}`,
    `Post-test (-) [${core.buildProbabilityBar(metrics.postTestNegative.value, 24)}] ${core.formatPercentage(metrics.postTestNegative.value)}`,
  ];

  return [
    "{bold}Performance Measures{/bold}",
    performance.join("\n"),
    "",
    "{bold}Bayesian Update{/bold}",
    bayes.join("\n"),
    "",
    "{bold}Probability Shift{/bold}",
    bars.join("\n"),
    "",
    "{bold}Interpretation{/bold}",
    `Sensitivity  ${metrics.sensitivity.note}`,
    `Specificity  ${metrics.specificity.note}`,
    `LR+          ${metrics.lrPositive.note}`,
    `LR-          ${metrics.lrNegative.note}`,
  ].join("\n");
}

function renderMetricLine(metric, kind) {
  const value = core.formatValue(metric.value, metric.formatter);
  const valueTag = colourValue(value, kind, metric.value);
  const confidence = renderConfidence(metric);
  const confidenceText = confidence ? `  {gray-fg}${confidence}{/}` : "";
  return `${metric.label.padEnd(36)} ${valueTag}${confidenceText}`;
}

function renderConfidence(metric) {
  if (!metric.ci) {
    return "";
  }

  return `95% CI ${core.formatPercentage(metric.ci.lower)} to ${core.formatPercentage(metric.ci.upper)}`;
}

function colourValue(value, kind, numericValue) {
  const { colour, badge } = metricTone(kind, numericValue);
  return `{${colour}-fg}${value}{/} {bold}{${colour}-fg}[${badge}]{/}{/}`;
}

function metricTone(kind, value) {
  if (!Number.isFinite(value)) {
    return { colour: "magenta", badge: "EXTREME" };
  }

  if (kind === "sensitivity" || kind === "specificity" || kind === "ppv" || kind === "npv") {
    if (value >= 0.9) {
      return { colour: "green", badge: "STRONG" };
    }
    if (value >= 0.7) {
      return { colour: "yellow", badge: "MOD" };
    }
    return { colour: "red", badge: "WEAK" };
  }

  if (kind === "lrPositive") {
    if (value >= 10) {
      return { colour: "green", badge: "RULE-IN" };
    }
    if (value >= 5) {
      return { colour: "yellow", badge: "USEFUL" };
    }
    if (value >= 2) {
      return { colour: "yellow", badge: "LIMITED" };
    }
    return { colour: "red", badge: "WEAK" };
  }

  if (kind === "lrNegative") {
    if (value <= 0.1) {
      return { colour: "green", badge: "RULE-OUT" };
    }
    if (value <= 0.2) {
      return { colour: "yellow", badge: "USEFUL" };
    }
    if (value <= 0.5) {
      return { colour: "yellow", badge: "LIMITED" };
    }
    return { colour: "red", badge: "WEAK" };
  }

  if (kind === "postPositive") {
    if (value >= 0.8) {
      return { colour: "green", badge: "HIGH" };
    }
    if (value >= 0.4) {
      return { colour: "yellow", badge: "MID" };
    }
    return { colour: "red", badge: "LOW" };
  }

  if (kind === "postNegative") {
    if (value <= 0.1) {
      return { colour: "green", badge: "LOW" };
    }
    if (value <= 0.3) {
      return { colour: "yellow", badge: "MID" };
    }
    return { colour: "red", badge: "HIGH" };
  }

  return { colour: "cyan", badge: "INFO" };
}

function runTui() {
  const datasets = [
    {
      key: "ad_hoc",
      name: "Ad hoc case",
      description: "Start from a blank custom case and enter your own confusion matrix values.",
      reference: null,
      isCustom: true,
    },
    ...datasetStore.listDatasets(),
  ];
  const screen = blessed.screen({
    smartCSR: true,
    title: "DIAGCALC TUI",
  });

  const prompt = blessed.prompt({
    parent: screen,
    border: "line",
    height: 8,
    width: "50%",
    top: "center",
    left: "center",
    label: " Edit value ",
    tags: true,
    keys: true,
    vi: true,
    hidden: true,
  });

  const message = blessed.message({
    parent: screen,
    border: "line",
    height: 8,
    width: "60%",
    top: "center",
    left: "center",
    label: " Export ",
    tags: true,
    keys: true,
    vi: true,
    hidden: true,
  });

  const outer = blessed.box({
    parent: screen,
    width: "100%",
    height: "100%",
  });

  blessed.box({
    parent: outer,
    top: 0,
    left: 0,
    width: "100%",
    height: 3,
    tags: true,
    border: "line",
    content: "{bold}DIAGCALC{/bold}  Arrows move  Enter edit/load  n new ad hoc case  x export txt  m export md  Tab/Ctrl-N next panel  Shift-Tab/Ctrl-P previous  r reset  q quit",
  });

  const datasetList = blessed.list({
    parent: outer,
    top: 3,
    left: 0,
    width: "26%",
    bottom: 0,
    label: " Datasets ",
    border: "line",
    keys: true,
    vi: true,
    mouse: true,
    style: {
      selected: {
        bg: "blue",
      },
      border: {
        fg: "white",
      },
      focus: {
        border: {
          fg: "blue",
        },
      },
    },
    items: datasets.map((dataset) => dataset.isCustom ? `* ${dataset.name}` : `${dataset.key}  ${dataset.name}`),
  });

  const datasetInfo = blessed.box({
    parent: outer,
    top: 3,
    left: "26%",
    width: "28%",
    height: 8,
    label: " Scenario ",
    border: "line",
    tags: true,
    scrollable: true,
    alwaysScroll: true,
    content: "Select a dataset on the left or edit the fields manually.",
  });

  const inputForm = blessed.box({
    parent: outer,
    top: 11,
    left: "26%",
    width: "28%",
    bottom: 14,
    label: " Inputs ",
    border: "line",
    keys: true,
    vi: true,
    mouse: true,
    tags: true,
    style: {
      border: {
        fg: "white",
      },
      focus: {
        border: {
          fg: "blue",
        },
      },
    },
  });

  const resultsBox = blessed.box({
    parent: outer,
    top: 3,
    left: "54%",
    width: "46%",
    bottom: 0,
    label: " Results ",
    border: "line",
    keys: true,
    vi: true,
    mouse: true,
    scrollable: true,
    alwaysScroll: true,
    tags: true,
    content: "Press Enter on a dataset or input row.",
    style: {
      border: {
        fg: "white",
      },
      focus: {
        border: {
          fg: "blue",
        },
      },
    },
  });

  const feedbackBox = blessed.box({
    parent: outer,
    bottom: 8,
    left: "26%",
    width: "28%",
    height: 6,
    label: " Feedback ",
    border: "line",
    content: "Ready.",
  });

  blessed.box({
    parent: outer,
    bottom: 0,
    left: "26%",
    width: "28%",
    height: 8,
    label: " Shortcuts ",
    border: "line",
    content: [
      "Enter   edit/load",
      "n       ad hoc case",
      "x       export .txt",
      "m       export .md",
      "Tab     next panel",
      "Ctrl-N  next panel",
      "Ctrl-P  previous panel",
      "Arrows  move/select",
      "r       reset",
      "q       quit",
    ].join("\n"),
  });

  const fields = [
    { key: "tp", label: "True positives", parser: core.safeParseInt },
    { key: "fp", label: "False positives", parser: core.safeParseInt },
    { key: "fn", label: "False negatives", parser: core.safeParseInt },
    { key: "tn", label: "True negatives", parser: core.safeParseInt },
    {
      key: "preTestProb",
      label: "Pre-test probability (%)",
      parser: (value) => {
        const normalised = core.normaliseDecimal(value);
        return normalised === "" ? NaN : parseFloat(normalised);
      },
    },
  ];

  const state = {
    activeCaseLabel: "Ad hoc case",
    activeDatasetKey: "ad_hoc",
    selectedFieldIndex: 0,
    modalOpen: false,
    rawInput: {
      tp: "",
      fp: "",
      fn: "",
      tn: "",
      preTestProb: "",
    },
    input: {
      tp: NaN,
      fp: NaN,
      fn: NaN,
      tn: NaN,
      preTestProb: NaN,
    },
  };

  const panels = [datasetList, inputForm, resultsBox];

  function currentFocusIndex() {
    const index = panels.indexOf(screen.focused);
    return index === -1 ? 0 : index;
  }

  function focusPanel(offset) {
    if (state.modalOpen) {
      return;
    }

    const nextIndex = (currentFocusIndex() + offset + panels.length) % panels.length;
    panels[nextIndex].focus();
    screen.render();
  }

  function setFeedback(message) {
    feedbackBox.setContent(message);
  }

  function syncParsedInputField(fieldKey) {
    const field = fields.find((item) => item.key === fieldKey);
    if (!field) {
      return;
    }

    const rawValue = state.rawInput[fieldKey];
    state.input[fieldKey] = rawValue === "" ? NaN : field.parser(rawValue);
  }

  function syncAllParsedInputs() {
    fields.forEach((field) => {
      syncParsedInputField(field.key);
    });
  }

  function setFieldValue(fieldKey, rawValue) {
    state.rawInput[fieldKey] = rawValue;
    syncParsedInputField(fieldKey);
  }

  function resetFieldValues() {
    fields.forEach((field) => {
      state.rawInput[field.key] = "";
      state.input[field.key] = NaN;
    });
  }

  function runModal(task) {
    state.modalOpen = true;
    screen.saveFocus();
    task(() => {
      state.modalOpen = false;
      screen.restoreFocus();
      screen.render();
    });
  }

  function currentCaseSlug(extension) {
    const base = state.activeCaseLabel
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "diagcalc-case";
    return `${base}.${extension}`;
  }

  function setDatasetInfo(dataset) {
    if (!dataset) {
      datasetInfo.setContent("Select a dataset on the left or edit the fields manually.");
      return;
    }

    const reference = dataset.reference
      ? `\n\nReference: ${dataset.reference.authors} ${dataset.reference.title}. ${dataset.reference.journal}. DOI ${dataset.reference.doi}`
      : dataset.isCustom
        ? "\n\nReference: user-defined case."
        : "\n\nReference: generic teaching scenario.";
    datasetInfo.setContent(`{bold}${dataset.name}{/bold}\n${dataset.description}${reference}`);
  }

  function moveFieldSelectionGrid(direction) {
    const current = state.selectedFieldIndex;

    if (current === 4) {
      if (direction === "up") {
        state.selectedFieldIndex = 2;
      }
    } else if (current === 0) {
      if (direction === "right") {
        state.selectedFieldIndex = 1;
      } else if (direction === "down") {
        state.selectedFieldIndex = 2;
      }
    } else if (current === 1) {
      if (direction === "left") {
        state.selectedFieldIndex = 0;
      } else if (direction === "down") {
        state.selectedFieldIndex = 3;
      }
    } else if (current === 2) {
      if (direction === "up") {
        state.selectedFieldIndex = 0;
      } else if (direction === "right") {
        state.selectedFieldIndex = 3;
      } else if (direction === "down") {
        state.selectedFieldIndex = 4;
      }
    } else if (current === 3) {
      if (direction === "up") {
        state.selectedFieldIndex = 1;
      } else if (direction === "left") {
        state.selectedFieldIndex = 2;
      } else if (direction === "down") {
        state.selectedFieldIndex = 4;
      }
    }

    updateInputForm();
    screen.render();
  }

  function updateInputForm() {
    const totals = buildTotals(state.input);
    const tpDisplay = renderFieldCell(state, fields, 0);
    const fpDisplay = renderFieldCell(state, fields, 1);
    const fnDisplay = renderFieldCell(state, fields, 2);
    const tnDisplay = renderFieldCell(state, fields, 3);
    const preDisplay = renderFieldCell(state, fields, 4, 18);
    const lines = [
      "{bold}Confusion Matrix Editor{/bold}",
      "",
      "               Disease +              Disease -",
      `Test +      ${tpDisplay}       ${fpDisplay}`,
      `Test -      ${fnDisplay}       ${tnDisplay}`,
      "",
      `{bold}${fields[4].label}{/bold}`,
      preDisplay,
      "",
      `{bold}Totals{/bold}`,
      `Diseased: ${totals.diseased}   Non-diseased: ${totals.nonDiseased}`,
      `Study total: ${totals.total}`,
      "",
      "Use arrows to move between cells and type directly.",
    ];

    inputForm.setLabel(` Inputs - ${state.activeCaseLabel} `);
    inputForm.setContent(lines.join("\n"));
  }

  function calculate() {
    const validation = core.validateInputs(state.input);
    if (!validation.valid) {
      resultsBox.setContent(buildPendingResults(state.activeCaseLabel, validation.message));
      setFeedback(validation.message);
      screen.render();
      return;
    }

    const metrics = core.calculateMetrics(state.input);
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildResultSummary(state.activeCaseLabel, state.input, metrics));
    resultsBox.setScrollPerc(0);
    setFeedback("Calculation complete.");
    screen.render();
  }

  function applyDataset(dataset) {
    if (dataset.isCustom) {
      startAdHocCase();
      return;
    }

    state.activeCaseLabel = dataset.name;
    state.activeDatasetKey = dataset.key;
    state.selectedFieldIndex = 0;
    setFieldValue("tp", String(dataset.tp));
    setFieldValue("fp", String(dataset.fp));
    setFieldValue("fn", String(dataset.fn));
    setFieldValue("tn", String(dataset.tn));
    setFieldValue("preTestProb", String(dataset.preTestProb));
    setDatasetInfo(dataset);
    updateInputForm();
    setFeedback(`Loaded dataset: ${dataset.name}`);
    calculate();
  }

  function resetForm() {
    resetFieldValues();
    state.activeCaseLabel = "Ad hoc case";
    state.activeDatasetKey = "ad_hoc";
    state.selectedFieldIndex = 0;
    updateInputForm();
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildPendingResults(state.activeCaseLabel, "Enter or load a case to calculate metrics."));
    setFeedback("Fields cleared.");
    setDatasetInfo(datasets[datasetList.selected] || datasets[0] || null);
    screen.render();
  }

  function startAdHocCase() {
    state.activeCaseLabel = "Ad hoc case";
    state.activeDatasetKey = "ad_hoc";
    state.selectedFieldIndex = 0;
    resetFieldValues();
    datasetList.select(0);
    setDatasetInfo(datasets[0]);
    updateInputForm();
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildPendingResults(state.activeCaseLabel, "Fill in the confusion matrix and pre-test probability."));
    setFeedback("Started a blank ad hoc case.");
    inputForm.focus();
    screen.render();
  }

  function editSelectedField() {
    const selectedIndex = state.selectedFieldIndex;
    const field = fields[selectedIndex];
    if (!field) {
      return;
    }

    const currentValue = state.rawInput[field.key];
    runModal((done) => {
      prompt.input(`Enter ${field.label.toLowerCase()}`, currentValue, (error, value) => {
        if (!error && value !== null) {
          setFieldValue(field.key, sanitiseRawInput(field.key, value));
          if (state.activeDatasetKey !== "ad_hoc") {
            state.activeCaseLabel = `Customised: ${state.activeCaseLabel}`;
            state.activeDatasetKey = "ad_hoc";
          }
          updateInputForm();
          state.selectedFieldIndex = selectedIndex;
          inputForm.focus();
          calculate();
        } else {
          inputForm.focus();
        }

        done();
      });
    });
  }

  function handleDirectFieldInput(character, key) {
    if (state.modalOpen || screen.focused !== inputForm) {
      return;
    }

    const field = fields[state.selectedFieldIndex];
    if (!field) {
      return;
    }

    const current = state.rawInput[field.key];

    if (key && key.name === "backspace") {
      setFieldValue(field.key, current.slice(0, -1));
    } else if (key && (key.name === "delete" || key.full === "C-u")) {
      setFieldValue(field.key, "");
    } else if (typeof character === "string" && character !== "") {
      const next = sanitiseRawInput(field.key, `${current}${character}`);
      if (next === current && !isAcceptedCharacter(field.key, character, current)) {
        return;
      }
      setFieldValue(field.key, next);
    } else {
      return;
    }

    if (state.activeDatasetKey !== "ad_hoc") {
      state.activeCaseLabel = `Customised: ${state.activeCaseLabel}`;
      state.activeDatasetKey = "ad_hoc";
    }

    updateInputForm();
    calculate();
  }

  function exportCurrentCase(format) {
    const extension = format === "markdown" ? "md" : "txt";
    const defaultPath = path.join(process.cwd(), currentCaseSlug(extension));

    runModal((done) => {
      prompt.input(`Export ${format} to path`, defaultPath, (error, outputPath) => {
        if (!error && outputPath !== null) {
          const trimmedPath = outputPath.trim();
          if (!trimmedPath) {
            setFeedback("Export cancelled: empty path.");
            done();
            return;
          }

          const validation = core.validateInputs(state.input);
          const metrics = validation.valid ? core.calculateMetrics(state.input) : null;
          const content = format === "markdown"
            ? buildMarkdownExport(state, metrics, validation)
            : buildTextExport(state, metrics, validation);

          try {
            fs.writeFileSync(trimmedPath, content, "utf8");
            setFeedback(`Exported ${format} report to ${trimmedPath}`);
            message.display(`{green-fg}Saved{/}\n${trimmedPath}`, 3, () => {
              done();
            });
            return;
          } catch (writeError) {
            setFeedback(`Export failed: ${writeError.message}`);
            message.display(`{red-fg}Export failed{/}\n${writeError.message}`, 4, () => {
              done();
            });
            return;
          }
        }

        done();
      });
    });
  }

  datasetList.on("select", (_, index) => {
    setDatasetInfo(datasets[index] || null);
    screen.render();
  });

  datasetList.key(["enter", "space"], () => {
    const dataset = datasets[datasetList.selected];
    if (dataset) {
      applyDataset(dataset);
      inputForm.focus();
    }
  });

  inputForm.key(["up", "k"], () => {
    moveFieldSelectionGrid("up");
  });

  inputForm.key(["down", "j"], () => {
    moveFieldSelectionGrid("down");
  });

  inputForm.key(["left", "h"], () => {
    moveFieldSelectionGrid("left");
  });

  inputForm.key(["right", "l"], () => {
    moveFieldSelectionGrid("right");
  });

  inputForm.key(["enter", "e"], () => {
    editSelectedField();
  });
  inputForm.on("keypress", (character, key) => {
    if (!key) {
      return;
    }

    if (["up", "down", "left", "right", "k", "j", "h", "l", "enter", "tab"].includes(key.name) || ["C-n", "C-p"].includes(key.full)) {
      return;
    }

    handleDirectFieldInput(character, key);
  });

  resultsBox.key(["up"], () => resultsBox.scroll(-1));
  resultsBox.key(["down"], () => resultsBox.scroll(1));
  resultsBox.key(["pageup"], () => resultsBox.scroll(-10));
  resultsBox.key(["pagedown"], () => resultsBox.scroll(10));

  screen.key(["q", "C-c"], () => {
    if (!state.modalOpen) {
      process.exit(0);
    }
  });
  screen.key(["n"], () => {
    if (!state.modalOpen) {
      startAdHocCase();
    }
  });
  screen.key(["r"], () => {
    if (!state.modalOpen) {
      resetForm();
    }
  });
  screen.key(["x"], () => {
    if (!state.modalOpen) {
      exportCurrentCase("text");
    }
  });
  screen.key(["m"], () => {
    if (!state.modalOpen) {
      exportCurrentCase("markdown");
    }
  });
  screen.key(["tab", "C-n"], () => {
    if (!state.modalOpen) {
      focusPanel(1);
    }
  });
  screen.key(["S-tab", "backtab", "C-p"], () => {
    if (!state.modalOpen) {
      focusPanel(-1);
    }
  });

  datasetList.focus();
  datasetList.select(0);
  syncAllParsedInputs();
  updateInputForm();
  setDatasetInfo(datasets[0] || null);
  resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
  resultsBox.setContent(buildPendingResults(state.activeCaseLabel, "Choose a library case or start an ad hoc case."));
  screen.render();
}

function buildPendingResults(caseLabel, message) {
  return [
    buildStatusStrip({
      caseLabel,
      status: "INCOMPLETE",
      statusColour: "yellow",
      summary: message,
    }),
    "",
    `{bold}${caseLabel}{/bold}`,
    "",
    message,
    "",
    "Use the dataset panel for library scenarios, or press {bold}n{/bold} for a blank ad hoc case.",
    "Then edit TP, FP, FN, TN, and pre-test probability in the input panel.",
  ].join("\n");
}

function buildResultSummary(caseLabel, input, metrics) {
  const totals = buildTotals(input);
  const caseSummary = [
    buildStatusStrip({
      caseLabel,
      status: "VALID",
      statusColour: "green",
      summary: `LR+ ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)} | LR- ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)} | Post+ ${core.formatValue(metrics.postTestPositive.value)} | Post- ${core.formatValue(metrics.postTestNegative.value)}`,
    }),
    "",
    "{bold}Case Overview{/bold}",
    buildConfusionMatrixBox(input),
    `Diseased ${totals.diseased}   Non-diseased ${totals.nonDiseased}   Total ${totals.total}`,
    `Pre-test probability entered: ${core.formatPercentage(metrics.preTestProbability.value)}`,
    "",
  ].join("\n");

  return `${caseSummary}${renderResults(metrics)}`;
}

function buildTotals(input) {
  const tp = Number.isFinite(input.tp) ? input.tp : 0;
  const fp = Number.isFinite(input.fp) ? input.fp : 0;
  const fn = Number.isFinite(input.fn) ? input.fn : 0;
  const tn = Number.isFinite(input.tn) ? input.tn : 0;

  return {
    diseased: tp + fn,
    nonDiseased: fp + tn,
    total: tp + fp + fn + tn,
  };
}

function displayValue(value) {
  return Number.isFinite(value) ? String(value) : "-";
}

function buildConfusionMatrixBox(input) {
  const tp = displayValue(input.tp).padStart(5);
  const fp = displayValue(input.fp).padStart(5);
  const fn = displayValue(input.fn).padStart(5);
  const tn = displayValue(input.tn).padStart(5);

  return [
    "{bold}Confusion matrix{/bold}",
    "┌───────────────┬───────────┬───────────┐",
    "│               │ Disease + │ Disease - │",
    "├───────────────┼───────────┼───────────┤",
    `│ Test +        │ ${tp}     │ ${fp}     │`,
    `│ Test -        │ ${fn}     │ ${tn}     │`,
    "└───────────────┴───────────┴───────────┘",
  ].join("\n");
}

function renderFieldCell(state, fields, index, width = 10) {
  const field = fields[index];
  const rawValue = state.rawInput[field.key] === "" ? "-" : state.rawInput[field.key];
  const padded = rawValue.padEnd(width);

  if (state.selectedFieldIndex === index) {
    return `{black-fg}{white-bg} ${padded} {/}`;
  }

  return `{bold}${padded}{/bold}`;
}

function sanitiseRawInput(fieldKey, rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  if (fieldKey === "preTestProb") {
    let cleaned = rawValue.replace(/,/g, ".").replace(/[^0-9.]/g, "");
    const firstDotIndex = cleaned.indexOf(".");
    if (firstDotIndex !== -1) {
      cleaned = `${cleaned.slice(0, firstDotIndex + 1)}${cleaned.slice(firstDotIndex + 1).replace(/\./g, "")}`;
    }
    return cleaned;
  }

  return rawValue.replace(/\D/g, "");
}

function isAcceptedCharacter(fieldKey, character, current) {
  if (fieldKey === "preTestProb") {
    if (/^[0-9]$/.test(character)) {
      return true;
    }
    if ((character === "." || character === ",") && !current.includes(".") && !current.includes(",")) {
      return true;
    }
    return false;
  }

  return /^[0-9]$/.test(character);
}

function buildStatusStrip({ caseLabel, status, statusColour, summary }) {
  return `{bold}${caseLabel}{/bold}  {${statusColour}-fg}[${status}]{/}  ${summary}`;
}

function buildTextExport(state, metrics, validation) {
  const lines = [
    `DIAGCALC - ${state.activeCaseLabel}`,
    "",
    "Confusion matrix",
    `  TP ${displayValue(state.input.tp)}   FP ${displayValue(state.input.fp)}`,
    `  FN ${displayValue(state.input.fn)}   TN ${displayValue(state.input.tn)}`,
    `  Pre-test probability ${displayValue(state.input.preTestProb)}%`,
    "",
  ];

  if (!validation.valid || !metrics) {
    lines.push(`Validation: ${validation.message}`);
    return `${lines.join("\n")}\n`;
  }

  lines.push(...buildPlainMetricSections(metrics));
  return `${lines.join("\n")}\n`;
}

function buildMarkdownExport(state, metrics, validation) {
  const lines = [
    `# DIAGCALC - ${state.activeCaseLabel}`,
    "",
    "## Case Input",
    "",
    "|                | Disease + | Disease - |",
    "|----------------|-----------|-----------|",
    `| Test +         | ${displayValue(state.input.tp)} | ${displayValue(state.input.fp)} |`,
    `| Test -         | ${displayValue(state.input.fn)} | ${displayValue(state.input.tn)} |`,
    "",
    `Pre-test probability: ${displayValue(state.input.preTestProb)}%`,
    "",
  ];

  if (!validation.valid || !metrics) {
    lines.push("## Validation");
    lines.push("");
    lines.push(validation.message);
    lines.push("");
    return `${lines.join("\n")}`;
  }

  lines.push(...buildMarkdownMetricSections(metrics));
  return `${lines.join("\n")}`;
}

function buildPlainMetricSections(metrics) {
  return [
    "Performance Measures",
    `  Sensitivity: ${core.formatValue(metrics.sensitivity.value)} (${renderConfidence(metrics.sensitivity)})`,
    `  Specificity: ${core.formatValue(metrics.specificity.value)} (${renderConfidence(metrics.specificity)})`,
    `  PPV: ${core.formatValue(metrics.ppv.value)} (${renderConfidence(metrics.ppv)})`,
    `  NPV: ${core.formatValue(metrics.npv.value)} (${renderConfidence(metrics.npv)})`,
    "",
    "Bayesian Update",
    `  LR+: ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)}`,
    `  LR-: ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)}`,
    `  Post-test probability (+): ${core.formatValue(metrics.postTestPositive.value)}`,
    `  Post-test probability (-): ${core.formatValue(metrics.postTestNegative.value)}`,
    "",
    "Interpretation",
    `  Sensitivity: ${metrics.sensitivity.note}`,
    `  Specificity: ${metrics.specificity.note}`,
    `  LR+: ${metrics.lrPositive.note}`,
    `  LR-: ${metrics.lrNegative.note}`,
  ];
}

function buildMarkdownMetricSections(metrics) {
  return [
    "## Performance Measures",
    "",
    "| Metric | Value | Confidence interval |",
    "|--------|-------|---------------------|",
    `| Sensitivity | ${core.formatValue(metrics.sensitivity.value)} | ${renderConfidence(metrics.sensitivity)} |`,
    `| Specificity | ${core.formatValue(metrics.specificity.value)} | ${renderConfidence(metrics.specificity)} |`,
    `| PPV | ${core.formatValue(metrics.ppv.value)} | ${renderConfidence(metrics.ppv)} |`,
    `| NPV | ${core.formatValue(metrics.npv.value)} | ${renderConfidence(metrics.npv)} |`,
    "",
    "## Bayesian Update",
    "",
    `- LR+: ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)}`,
    `- LR-: ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)}`,
    `- Pre-test probability: ${core.formatValue(metrics.preTestProbability.value)}`,
    `- Post-test probability (+): ${core.formatValue(metrics.postTestPositive.value)}`,
    `- Post-test probability (-): ${core.formatValue(metrics.postTestNegative.value)}`,
    "",
    "## Interpretation",
    "",
    `- Sensitivity: ${metrics.sensitivity.note}`,
    `- Specificity: ${metrics.specificity.note}`,
    `- LR+: ${metrics.lrPositive.note}`,
    `- LR-: ${metrics.lrNegative.note}`,
    "",
  ];
}

module.exports = {
  runTui,
};
