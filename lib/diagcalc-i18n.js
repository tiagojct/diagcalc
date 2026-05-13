(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcI18n = factory();
}(typeof globalThis !== "undefined" ? globalThis : this, () => {
  // Translation tables. Only UI chrome (headings, labels, buttons, kickers,
  // panel summaries, key help text) is translated — engine output (sens/spec
  // notes, LR/DOR interpretations, validation messages) stays in English so
  // that clinical phrasing stays uniform and so unit tests remain valid.
  const translations = {
    en: {
      "page.title": "DIAG-CALC",
      "intro.tag": "Educational tool",
      "intro.lead": "Interactive calculator for exploring diagnostic test performance measures and applying Bayesian reasoning in clinical practice.",
      "intro.highlight1.h": "Key measures",
      "intro.highlight1.p": "Sensitivity, specificity, PPV, NPV, and likelihood ratios with 95% CI.",
      "intro.highlight2.h": "Post-test probability",
      "intro.highlight2.p": "Convert pre-test probability into positive and negative post-test probability.",
      "intro.highlight3.h": "Guided interpretation",
      "intro.highlight3.p": "Results explained to support self-directed learning.",
      "library.kicker": "Library",
      "library.h": "Load a study scenario",
      "library.help": "Pick a preset to load values, or fill in the matrix manually below.",
      "editor.kicker": "Editor",
      "editor.h": "Build the case",
      "editor.help": "Pick a preset above or enter the 2×2 below. Non-negative integers; pre-test probability under 100%.",
      "theme.toggle.label": "Toggle dark mode",
      "lang.label": "Language",
      "app.case.empty": "No case yet",
      "app.case.prefix": "Case:",
      "app.case.adhoc": "Ad-hoc case",
      "about.h": "About DIAGCALC",
      "form.kicker": "Setup",
      "form.h": "Define the case",
      "form.scenario": "Scenario",
      "form.scenario.empty": "— Select —",
      "form.scenario.group.generic": "Generic scenarios",
      "form.scenario.group.literature": "Medical literature cases",
      "form.scenario.help": "Pick a preset to load its values, or fill in the matrix manually below.",
      "form.matrix.legend": "Confusion matrix",
      "form.matrix.dpos": "Disease +",
      "form.matrix.dneg": "Disease −",
      "form.matrix.tpos": "Test +",
      "form.matrix.tneg": "Test −",
      "form.pre.label": "Pre-test probability (%)",
      "form.pre.help": "Estimate the disease prevalence in the study population or the clinical probability before the test.",
      "form.advanced.summary": "Advanced settings",
      "form.advanced.continuity": "Continuity correction for LR / DOR CIs",
      "form.advanced.continuity.auto": "Auto — apply +0.5 only when a 2×2 cell is zero",
      "form.advanced.continuity.always": "Always — apply +0.5 to every cell",
      "form.advanced.continuity.never": "Never — return ∞ if any cell is zero",
      "form.advanced.continuity.help": "When any cell of the confusion matrix is zero the log-normal CI for LR+ / LR− / DOR is undefined. The default adds 0.5 to every cell (Cox 1970) when this happens so the maths still produces a (wide) interval.",
      "form.calculate": "Calculate results",
      "form.clear": "Clear fields",
      "results.kicker": "Output",
      "results.h": "Results",
      "results.help": "Values are shown with 95% confidence intervals where applicable.",
      "results.print": "Print report",
      "fagan.h": "Fagan Nomogram",
      "fagan.help": "Graphical representation of the relationship between pre-test probability, likelihood ratio, and post-test probability.",
      "fagan.pre": "Pre-test",
      "fagan.lrpos": "LR+",
      "fagan.lrneg": "LR−",
      "fagan.postpos": "Post-test (+)",
      "fagan.postneg": "Post-test (−)",
      "feedback.calc.ok": "Calculation complete. Explore the interpretation guide below.",
      "feedback.cleared": "Fields cleared.",
      "feedback.scenario.loaded": "Scenario loaded. Adjust the values as needed and recalculate.",
      "feedback.history.reloaded": "Reloaded \"{label}\" from history.",
    },
    "pt-PT": {
      "page.title": "DIAG-CALC",
      "intro.tag": "Ferramenta educacional",
      "intro.lead": "Calculadora interactiva para explorar medidas de desempenho de testes de diagnóstico e aplicar raciocínio Bayesiano na prática clínica.",
      "intro.highlight1.h": "Medidas principais",
      "intro.highlight1.p": "Sensibilidade, especificidade, VPP, VPN e razões de verosimilhança com IC 95%.",
      "intro.highlight2.h": "Probabilidade pós-teste",
      "intro.highlight2.p": "Conversão da probabilidade pré-teste em probabilidades pós-teste positiva e negativa.",
      "intro.highlight3.h": "Interpretação guiada",
      "intro.highlight3.p": "Resultados explicados para suportar aprendizagem auto-dirigida.",
      "library.kicker": "Biblioteca",
      "library.h": "Carregar um cenário de estudo",
      "library.help": "Escolha um preset para carregar valores, ou preencha a matriz manualmente em baixo.",
      "editor.kicker": "Editor",
      "editor.h": "Construir o caso",
      "editor.help": "Escolha um preset acima ou preencha a matriz 2×2 abaixo. Inteiros não-negativos; probabilidade pré-teste abaixo de 100%.",
      "theme.toggle.label": "Alternar modo escuro",
      "lang.label": "Idioma",
      "app.case.empty": "Sem caso ainda",
      "app.case.prefix": "Caso:",
      "app.case.adhoc": "Caso ad-hoc",
      "about.h": "Sobre o DIAGCALC",
      "form.kicker": "Configuração",
      "form.h": "Definir o caso",
      "form.scenario": "Cenário",
      "form.scenario.empty": "— Seleccionar —",
      "form.scenario.group.generic": "Cenários genéricos",
      "form.scenario.group.literature": "Casos da literatura médica",
      "form.scenario.help": "Escolha um preset para carregar valores, ou preencha a matriz manualmente em baixo.",
      "form.matrix.legend": "Matriz de confusão",
      "form.matrix.dpos": "Doença +",
      "form.matrix.dneg": "Doença −",
      "form.matrix.tpos": "Teste +",
      "form.matrix.tneg": "Teste −",
      "form.pre.label": "Probabilidade pré-teste (%)",
      "form.pre.help": "Estime a prevalência da doença na população do estudo ou a probabilidade clínica antes do teste.",
      "form.advanced.summary": "Definições avançadas",
      "form.advanced.continuity": "Correcção de continuidade para os IC de LR / DOR",
      "form.advanced.continuity.auto": "Automática — aplicar +0,5 apenas quando alguma célula 2×2 é zero",
      "form.advanced.continuity.always": "Sempre — aplicar +0,5 a todas as células",
      "form.advanced.continuity.never": "Nunca — devolver ∞ se alguma célula for zero",
      "form.advanced.continuity.help": "Quando alguma célula da matriz é zero o IC log-normal para LR+ / LR− / DOR fica indefinido. O default adiciona 0,5 a todas as células (Cox 1970) nesses casos, mantendo um intervalo (largo, mas finito).",
      "form.calculate": "Calcular resultados",
      "form.clear": "Limpar campos",
      "results.kicker": "Resultado",
      "results.h": "Resultados",
      "results.help": "Os valores são apresentados com IC 95% sempre que aplicável.",
      "results.print": "Imprimir relatório",
      "fagan.h": "Nomograma de Fagan",
      "fagan.help": "Representação gráfica da relação entre probabilidade pré-teste, razão de verosimilhança e probabilidade pós-teste.",
      "fagan.pre": "Pré-teste",
      "fagan.lrpos": "LR+",
      "fagan.lrneg": "LR−",
      "fagan.postpos": "Pós-teste (+)",
      "fagan.postneg": "Pós-teste (−)",
      "feedback.calc.ok": "Cálculo concluído. Explore o guia de interpretação em baixo.",
      "feedback.cleared": "Campos limpos.",
      "feedback.scenario.loaded": "Cenário carregado. Ajuste os valores e recalcule se necessário.",
      "feedback.history.reloaded": "Recarregado \"{label}\" do histórico.",
    },
  };

  const FALLBACK = "en";
  const STORAGE_KEY = "diagcalc-lang";
  let activeLocale = FALLBACK;

  function getLocale() {
    return activeLocale;
  }

  function setLocale(locale) {
    activeLocale = translations[locale] ? locale : FALLBACK;
    if (typeof localStorage !== "undefined") {
      try { localStorage.setItem(STORAGE_KEY, activeLocale); } catch (_) {}
    }
  }

  function detectLocale() {
    if (typeof localStorage !== "undefined") {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && translations[stored]) return stored;
      } catch (_) {}
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      const tag = navigator.language;
      if (translations[tag]) return tag;
      // Match a base language (e.g., "pt" → "pt-PT")
      const base = tag.split("-")[0];
      const match = Object.keys(translations).find((k) => k === base || k.startsWith(base + "-"));
      if (match) return match;
    }
    return FALLBACK;
  }

  function t(key, vars) {
    const table = translations[activeLocale] || translations[FALLBACK];
    let value = table[key];
    if (value === undefined) value = translations[FALLBACK][key];
    if (value === undefined) return key;
    if (vars && typeof value === "string") {
      return value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? String(vars[k]) : `{${k}}`));
    }
    return value;
  }

  function applyToDom(root) {
    if (typeof document === "undefined") return;
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      if (key) el.textContent = t(key);
    });
    scope.querySelectorAll("[data-i18n-attr]").forEach((el) => {
      const spec = el.getAttribute("data-i18n-attr");
      // Format: "aria-label=some.key;title=other.key"
      spec.split(";").forEach((pair) => {
        const [attr, key] = pair.split("=").map((s) => s.trim());
        if (attr && key) el.setAttribute(attr, t(key));
      });
    });
  }

  function availableLocales() {
    return Object.keys(translations);
  }

  return {
    translations,
    getLocale,
    setLocale,
    detectLocale,
    t,
    applyToDom,
    availableLocales,
  };
}));
