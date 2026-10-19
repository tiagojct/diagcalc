const fs = require("fs");
const path = require("path");
const blessed = require("blessed");
const core = require("../lib/diagcalc-core");
const datasetStore = require("../lib/diagcalc-datasets");

const { renderResults, renderConfidence, CREW } = require("./presentation");
const { sanitiseRawInput, escapeTags, isAcceptedCharacter } = require("./input");
const { buildTextExport, buildMarkdownExport } = require("./report");

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
    content: "{bold}DIAGCALC{/bold}  Arrows move  Enter edit/load  n new  + chain  x export txt  m export md  Tab/Ctrl-N next panel  r reset  q quit",
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
        bg: CREW.queequeg,
      },
      border: {
        fg: CREW.ishmael,
      },
      focus: {
        border: {
          fg: CREW.queequeg,
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
    keys: true,
    mouse: true,
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
        fg: CREW.ishmael,
      },
      focus: {
        border: {
          fg: CREW.queequeg,
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
        fg: CREW.ishmael,
      },
      focus: {
        border: {
          fg: CREW.queequeg,
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
      "Enter edit/load   n new case",
      "+ chain   x txt   m md",
      "Tab/Ctrl-N next   Ctrl-P previous",
      "Arrows move/select   r reset   q quit",
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
      parser: core.parseProbability,
    },
  ];

  const state = {
    activeCaseLabel: "Ad hoc case",
    activeDatasetKey: "ad_hoc",
    originDatasetKey: null,
    previousTestSnapshot: null,
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

  const panels = [datasetList, inputForm, resultsBox, datasetInfo];

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
    const totalText = (value) => Number.isFinite(value) ? String(value) : "—";
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
      `Diseased: ${totalText(totals.diseased)}   Non-diseased: ${totalText(totals.nonDiseased)}`,
      `Study total: ${totalText(totals.total)}`,
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
    const warnings = [...core.buildBiasWarnings(state.input), ...datasetStore.buildDatasetWarnings(datasetStore.getDataset(state.originDatasetKey))];
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildResultSummary(state.activeCaseLabel, state.input, metrics, warnings));
    resultsBox.setScrollPerc(0);
    setFeedback(warnings.length > 0 ? `Calculation complete (${warnings.length} warning${warnings.length === 1 ? "" : "s"}).` : "Calculation complete.");
    screen.render();
  }

  function applyDataset(dataset) {
    if (dataset.isCustom) {
      startAdHocCase();
      return;
    }

    state.activeCaseLabel = dataset.name;
    state.activeDatasetKey = dataset.key;
    state.originDatasetKey = dataset.key;
    state.previousTestSnapshot = null;
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
    state.originDatasetKey = null;
    state.previousTestSnapshot = null;
    resetFieldValues();
    state.activeCaseLabel = "Ad hoc case";
    state.activeDatasetKey = "ad_hoc";
    state.selectedFieldIndex = 0;
    updateInputForm();
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildPendingResults(state.activeCaseLabel, "Enter or load a case to calculate metrics."));
    setFeedback("Fields cleared.");
    datasetList.select(0);
    setDatasetInfo(datasets[0]);
    screen.render();
  }

  function startAdHocCase() {
    state.originDatasetKey = null;
    state.previousTestSnapshot = null;
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

  function chainSecondTest() {
    const validation = core.validateInputs(state.input);
    if (!validation.valid) {
      setFeedback("Calculate a valid first test before chaining.");
      screen.render();
      return;
    }
    const m = core.calculateMetrics(state.input);
    const posteriorFraction = m.postTestPositive.value;
    if (!Number.isFinite(posteriorFraction)) {
      setFeedback("First test's post-test (+) is not finite; cannot chain.");
      screen.render();
      return;
    }
    const newPrePercent = core.chainedPreTestProbability(posteriorFraction);
    state.previousTestSnapshot = require("../lib/diagcalc-case").createSnapshot(state.input, {}, {
      label: state.activeCaseLabel, datasetKey: state.originDatasetKey,
      modified: state.activeDatasetKey === "ad_hoc" && Boolean(state.originDatasetKey),
      provenance: datasetStore.getDataset(state.originDatasetKey)?.provenance || null,
    });
    state.originDatasetKey = null;
    const previousLabel = state.activeCaseLabel.replace(/^Chained from: /, "");
    state.activeCaseLabel = `Chained from: ${previousLabel}`;
    state.activeDatasetKey = "ad_hoc";
    state.selectedFieldIndex = 0;
    resetFieldValues();
    setFieldValue("preTestProb", String(newPrePercent));
    datasetInfo.setContent(`{bold}Chained second test{/bold}\nPre-test set to ${core.formatPercentage(newPrePercent / 100)} from previous post-test (+). Results must be conditionally independent given disease status.\n\nEnter the new TP/FP/FN/TN, then the result panel will update.`);
    updateInputForm();
    resultsBox.setLabel(` Results - ${state.activeCaseLabel} `);
    resultsBox.setContent(buildPendingResults(state.activeCaseLabel, `Pre-test chained to ${core.formatPercentage(newPrePercent / 100)}. Enter the second test's matrix.`));
    setFeedback(`Chained: pre-test now ${core.formatPercentage(newPrePercent / 100)} (from previous post-test +).`);
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
      if (!isAcceptedCharacter(field.key, character, current)) {
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
      prompt.input(`Export ${format} to a new path`, defaultPath, async (error, outputPath) => {
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
            await fs.promises.writeFile(trimmedPath, content, { encoding: "utf8", flag: "wx" });
            setFeedback(`Exported ${format} report to ${trimmedPath}`);
            message.display(`{green-fg}Saved{/}\n${escapeTags(trimmedPath)}`, 3, () => {
              done();
            });
            return;
          } catch (writeError) {
            setFeedback(`Export failed: ${writeError.message}`);
            message.display(`{red-fg}Export failed{/}\n${escapeTags(writeError.message)}`, 4, () => {
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

  datasetInfo.key(["pageup"], () => datasetInfo.scroll(-5));
  datasetInfo.key(["pagedown"], () => datasetInfo.scroll(5));

  screen.key(["C-c"], () => {
    screen.destroy();
    process.exit(0);
  });
  screen.key(["q"], () => {
    if (!state.modalOpen) {
      screen.destroy();
      process.exit(0);
    }
  });
  screen.key(["n"], () => {
    if (!state.modalOpen) {
      startAdHocCase();
    }
  });
  screen.key(["+"], () => {
    if (!state.modalOpen) {
      chainSecondTest();
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

function buildResultSummary(caseLabel, input, metrics, warnings) {
  const totals = buildTotals(input);
  const warningsBlock = Array.isArray(warnings) && warnings.length > 0
    ? `\n{${"#DEC577"}-fg}{bold}Heads up:{/bold}{/}\n${warnings.map((w) => `  • ${w}`).join("\n")}\n`
    : "";
  const caseSummary = [
    buildStatusStrip({
      caseLabel,
      status: "VALID",
      statusColour: "green",
      summary: `LR+ ${core.formatValue(metrics.lrPositive.value, metrics.lrPositive.formatter)} | LR- ${core.formatValue(metrics.lrNegative.value, metrics.lrNegative.formatter)} | Post+ ${core.formatValue(metrics.postTestPositive.value)} | Post- ${core.formatValue(metrics.postTestNegative.value)}`,
    }),
    warningsBlock,
    "{bold}Case Overview{/bold}",
    buildConfusionMatrixBox(input),
    `Diseased ${totals.diseased}   Non-diseased ${totals.nonDiseased}   Total ${totals.total}`,
    `Pre-test probability entered: ${core.formatPercentage(metrics.preTestProbability.value)}`,
    "",
  ].join("\n");

  return `${caseSummary}${renderResults(metrics)}`;
}

function buildTotals(input) {
  const values = [input.tp, input.fp, input.fn, input.tn];
  if (values.some((value) => !Number.isFinite(value))) {
    return { diseased: NaN, nonDiseased: NaN, total: NaN };
  }
  const [tp, fp, fn, tn] = values;

  return {
    diseased: tp + fn,
    nonDiseased: fp + tn,
    total: tp + fp + fn + tn,
  };
}

function displayValue(value) {
  return Number.isFinite(value) ? String(value) : "-";
}

function formatPreTest(value) {
  return Number.isFinite(value) ? core.formatPercentage(value / 100) : "-";
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
  // Escape after padding: the escape tokens render as literal braces, while
  // the padding is computed on the visible characters.
  const padded = escapeTags(rawValue.padEnd(width));

  if (state.selectedFieldIndex === index) {
    return `{black-fg}{white-bg} ${padded} {/}`;
  }

  return `{bold}${padded}{/bold}`;
}

function buildStatusStrip({ caseLabel, status, statusColour, summary }) {
  return `{bold}${caseLabel}{/bold}  {${statusColour}-fg}[${status}]{/}  ${summary}`;
}

module.exports = {
  runTui,
};
