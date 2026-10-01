(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcPresentation = factory();
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), () => {
  const labels = {
    "sensitivity": "Sensitivity",
    "specificity": "Specificity",
    "ppv": "Positive predictive value (PPV)",
    "npv": "Negative predictive value (NPV)",
    "dor": "Diagnostic odds ratio (DOR)",
    "numberNeededToScreen": "Number needed to screen (NNS)",
    "lrPositive": "Positive likelihood ratio (LR+)",
    "lrNegative": "Negative likelihood ratio (LR-)",
    "preTestProbability": "Pre-test probability",
    "postTestPositive": "Post-test probability (positive result)",
    "postTestNegative": "Post-test probability (negative result)"
  };

  const portugueseLabels = {
    "sensitivity": "Sensibilidade",
    "specificity": "Especificidade",
    "ppv": "Valor preditivo positivo (VPP)",
    "npv": "Valor preditivo negativo (VPN)",
    "dor": "Odds ratio diagnóstica (DOR)",
    "numberNeededToScreen": "Número necessário para rastrear (NNS)",
    "lrPositive": "Razão de verosimilhança positiva (LR+)",
    "lrNegative": "Razão de verosimilhança negativa (LR−)",
    "preTestProbability": "Probabilidade pré-teste",
    "postTestPositive": "Probabilidade pós-teste (resultado positivo)",
    "postTestNegative": "Probabilidade pós-teste (resultado negativo)"
  };

  const constantNotes = {
    "ppv": "Probability of disease given a positive result.",
    "npv": "Probability of no disease given a negative result.",
    "preTestProbability": "Estimated starting point before the test result.",
    "postTestPositive": "Updated probability of disease after a positive test.",
    "postTestNegative": "Updated probability of disease after a negative test."
  };

  const portugueseNotes = {
    "ppv": "Probabilidade de doença após um resultado positivo.",
    "npv": "Probabilidade de ausência de doença após um resultado negativo.",
    "preTestProbability": "Estimativa inicial antes do resultado do teste.",
    "postTestPositive": "Probabilidade de doença actualizada após um teste positivo.",
    "postTestNegative": "Probabilidade de doença actualizada após um teste negativo."
  };

  const english = {
    "buildSensitivityNote.1": "Captures most cases with disease. Useful for screening.",
    "buildSensitivityNote.2": "Moderate sensitivity: consider alongside clinical context.",
    "buildSensitivityNote.3": "Low sensitivity: consider additional tests to reduce false negatives.",
    "buildSpecificityNote.1": "Few false positives. Suitable for confirming diagnoses.",
    "buildSpecificityNote.2": "Moderate specificity: confirm with other laboratory or clinical data.",
    "buildSpecificityNote.3": "Low specificity: beware of false positives and their impact on treatment decisions.",
    "interpretDOR.1": "DOR is undefined for this table.",
    "interpretDOR.2": "DOR is infinite because FP or FN is zero; this does not establish perfect separation.",
    "interpretDOR.3": "DOR ≥ 100: very strong discrimination between cases and non-cases.",
    "interpretDOR.4": "DOR ≥ 10: clinically useful discrimination.",
    "interpretDOR.5": "DOR > 1 but limited: the test discriminates only modestly.",
    "interpretDOR.6": "DOR = 1: the test provides no information.",
    "interpretDOR.7": "DOR < 1: results may be labelled the wrong way — review TP/FP/FN/TN assignments.",
    "interpretNNS.1": "NNS is undefined here (sensitivity or pre-test probability is zero).",
    "interpretNNS.2": "Roughly {count} screened to detect one true case — efficient at this prevalence.",
    "interpretNNS.3": "Roughly {count} screened to detect one true case — moderate yield.",
    "interpretNNS.4": "Roughly {count} screened to detect one true case — low yield, typical of low-prevalence screening.",
    "interpretNNS.5": "Roughly {count} screened to detect one true case — very low yield.",
    "interpretLRPositive.1": "LR+ is undefined for this table.",
    "interpretLRPositive.2": "LR+ is infinite in this sample: no false positives were observed.",
    "interpretLRPositive.3": "LR+ >= 10 indicates strong evidence in favour of disease.",
    "interpretLRPositive.4": "Moderate LR+: substantially increases the probability of disease.",
    "interpretLRPositive.5": "Low LR+: limited gain; combine with other data.",
    "interpretLRPositive.6": "LR+ < 1: a positive result decreases the probability of disease; review test direction.",
    "interpretLRPositive.7": "LR+ close to 1: a positive result barely changes the probability of disease.",
    "interpretLRNegative.1": "LR- is undefined for this table.",
    "interpretLRNegative.2": "LR- is infinite: a negative result does not reduce the probability of disease.",
    "interpretLRNegative.3": "LR- <= 0.1 indicates strong evidence against disease.",
    "interpretLRNegative.4": "Moderate LR-: reduces the probability of disease.",
    "interpretLRNegative.5": "Low LR-: limited impact; consider further evaluation.",
    "interpretLRNegative.6": "LR- > 1: a negative result increases the probability of disease; review test direction.",
    "interpretLRNegative.7": "LR- close to 1: a negative result does not rule out disease.",
    "interpretKappa.1": "Undefined",
    "interpretKappa.2": "Poor (less than chance)",
    "interpretKappa.3": "Slight",
    "interpretKappa.4": "Fair",
    "interpretKappa.5": "Moderate",
    "interpretKappa.6": "Substantial",
    "interpretKappa.7": "Almost perfect"
  };

  const portuguese = {
    "buildSensitivityNote.1": "Detecta a maioria dos casos com doença. Útil para rastreio.",
    "buildSensitivityNote.2": "Sensibilidade moderada: considerar o contexto clínico.",
    "buildSensitivityNote.3": "Sensibilidade baixa: considerar testes adicionais para reduzir falsos negativos.",
    "buildSpecificityNote.1": "Poucos falsos positivos. Adequado para confirmação diagnóstica.",
    "buildSpecificityNote.2": "Especificidade moderada: confirmar com outros dados laboratoriais ou clínicos.",
    "buildSpecificityNote.3": "Especificidade baixa: considerar os falsos positivos e o seu impacto nas decisões.",
    "interpretDOR.1": "DOR indefinida para esta tabela.",
    "interpretDOR.2": "DOR infinita porque FP ou FN é zero; não demonstra separação perfeita.",
    "interpretDOR.3": "DOR ≥ 100: discriminação muito forte entre casos e não casos.",
    "interpretDOR.4": "DOR ≥ 10: discriminação clinicamente útil.",
    "interpretDOR.5": "DOR > 1, mas limitada: discriminação modesta.",
    "interpretDOR.6": "DOR = 1: o teste não fornece informação.",
    "interpretDOR.7": "DOR < 1: rever a direcção do teste e a atribuição TP/FP/FN/TN.",
    "interpretNNS.1": "NNS indefinido (sensibilidade ou probabilidade pré-teste igual a zero).",
    "interpretNNS.2": "Cerca de {count} rastreados para detectar um caso verdadeiro — eficiente nesta prevalência.",
    "interpretNNS.3": "Cerca de {count} rastreados para detectar um caso verdadeiro — rendimento moderado.",
    "interpretNNS.4": "Cerca de {count} rastreados para detectar um caso verdadeiro — baixo rendimento, típico de rastreio com baixa prevalência.",
    "interpretNNS.5": "Cerca de {count} rastreados para detectar um caso verdadeiro — rendimento muito baixo.",
    "interpretLRPositive.1": "LR+ indefinida para esta tabela.",
    "interpretLRPositive.2": "LR+ infinita nesta amostra: não foram observados falsos positivos.",
    "interpretLRPositive.3": "LR+ ≥ 10 indica forte evidência a favor da doença.",
    "interpretLRPositive.4": "LR+ moderada: aumenta substancialmente a probabilidade de doença.",
    "interpretLRPositive.5": "LR+ baixa: ganho limitado; combinar com outros dados.",
    "interpretLRPositive.6": "LR+ < 1: um resultado positivo reduz a probabilidade de doença; rever a direcção do teste.",
    "interpretLRPositive.7": "LR+ próxima de 1: um resultado positivo altera pouco a probabilidade de doença.",
    "interpretLRNegative.1": "LR− indefinida para esta tabela.",
    "interpretLRNegative.2": "LR− infinita: um resultado negativo não reduz a probabilidade de doença.",
    "interpretLRNegative.3": "LR− ≤ 0,1 indica forte evidência contra a doença.",
    "interpretLRNegative.4": "LR− moderada: reduz a probabilidade de doença.",
    "interpretLRNegative.5": "LR− baixa: impacto limitado; considerar avaliação adicional.",
    "interpretLRNegative.6": "LR− > 1: um resultado negativo aumenta a probabilidade de doença; rever a direcção do teste.",
    "interpretLRNegative.7": "LR− próxima de 1: um resultado negativo não exclui doença.",
    "interpretKappa.1": "Indefinido",
    "interpretKappa.2": "Fraco (inferior ao acaso)",
    "interpretKappa.3": "Ligeiro",
    "interpretKappa.4": "Razoável",
    "interpretKappa.5": "Moderado",
    "interpretKappa.6": "Substancial",
    "interpretKappa.7": "Quase perfeito"
  };

  const helpers = {
    "sensitivity": "buildSensitivityNote",
    "specificity": "buildSpecificityNote",
    "dor": "interpretDOR",
    "numberNeededToScreen": "interpretNNS",
    "lrPositive": "interpretLRPositive",
    "lrNegative": "interpretLRNegative"
  };

  function buildSensitivityNote(value) {
    if (value >= 0.9) {
      return { id: "buildSensitivityNote.1", params: {} };
    }
    if (value >= 0.7) {
      return { id: "buildSensitivityNote.2", params: {} };
    }
    return { id: "buildSensitivityNote.3", params: {} };
  }

  function buildSpecificityNote(value) {
    if (value >= 0.9) {
      return { id: "buildSpecificityNote.1", params: {} };
    }
    if (value >= 0.7) {
      return { id: "buildSpecificityNote.2", params: {} };
    }
    return { id: "buildSpecificityNote.3", params: {} };
  }

  function interpretDOR(value) {
    if (Number.isNaN(value)) return { id: "interpretDOR.1", params: {} };
    if (value === Infinity) return { id: "interpretDOR.2", params: {} };
    if (value >= 100) {
      return { id: "interpretDOR.3", params: {} };
    }
    if (value >= 10) {
      return { id: "interpretDOR.4", params: {} };
    }
    if (value > 1) {
      return { id: "interpretDOR.5", params: {} };
    }
    if (value === 1) {
      return { id: "interpretDOR.6", params: {} };
    }
    return { id: "interpretDOR.7", params: {} };
  }

  function interpretNNS(value) {
    if (!Number.isFinite(value) || value <= 0) {
      return { id: "interpretNNS.1", params: {} };
    }
    const rounded = Math.ceil(value);
    if (rounded < 10) {
      return { id: "interpretNNS.2", params: { count: rounded } };
    }
    if (rounded < 100) {
      return { id: "interpretNNS.3", params: { count: rounded } };
    }
    if (rounded < 1000) {
      return { id: "interpretNNS.4", params: { count: rounded } };
    }
    return { id: "interpretNNS.5", params: { count: rounded } };
  }

  function interpretLRPositive(value) {
    if (Number.isNaN(value)) return { id: "interpretLRPositive.1", params: {} };
    if (value === Infinity) {
      return { id: "interpretLRPositive.2", params: {} };
    }
    if (value >= 10) {
      return { id: "interpretLRPositive.3", params: {} };
    }
    if (value >= 5) {
      return { id: "interpretLRPositive.4", params: {} };
    }
    if (value >= 2) {
      return { id: "interpretLRPositive.5", params: {} };
    }
    if (value < 1) return { id: "interpretLRPositive.6", params: {} };
    return { id: "interpretLRPositive.7", params: {} };
  }

  function interpretLRNegative(value) {
    if (Number.isNaN(value)) return { id: "interpretLRNegative.1", params: {} };
    if (value === Infinity) {
      return { id: "interpretLRNegative.2", params: {} };
    }
    if (value <= 0.1) {
      return { id: "interpretLRNegative.3", params: {} };
    }
    if (value <= 0.2) {
      return { id: "interpretLRNegative.4", params: {} };
    }
    if (value <= 0.5) {
      return { id: "interpretLRNegative.5", params: {} };
    }
    if (value > 1) return { id: "interpretLRNegative.6", params: {} };
    return { id: "interpretLRNegative.7", params: {} };
  }

  function interpretKappa(value) {
    if (!Number.isFinite(value)) return { id: "interpretKappa.1", params: {} };
    if (value < 0) return { id: "interpretKappa.2", params: {} };
    if (value < 0.21) return { id: "interpretKappa.3", params: {} };
    if (value < 0.41) return { id: "interpretKappa.4", params: {} };
    if (value < 0.61) return { id: "interpretKappa.5", params: {} };
    if (value < 0.81) return { id: "interpretKappa.6", params: {} };
    return { id: "interpretKappa.7", params: {} };
  }

  const selectors = { buildSensitivityNote, buildSpecificityNote, interpretDOR, interpretNNS, interpretLRPositive, interpretLRNegative, interpretKappa };

  function interpretation(key, value) {
    return helpers[key] ? selectors[helpers[key]](value) : { id: key, params: {} };
  }

  function noteFor(helper, value, locale = "en") {
    const selected = selectors[helper](value);
    const table = locale === "pt-PT" ? portuguese : english;
    return (table[selected.id] || english[selected.id]).replace(/\{(\w+)\}/g, (_, key) => String(selected.params[key]));
  }

  /**
   * @param {import("./diagcalc-types").NumericResults} results
   * @param {{formatLikelihood: (value: number) => string, formatNNS: (value: number) => string}} formatters
   * @param {string} [locale]
   * @returns {import("./diagcalc-types").PresentedResults}
   */
  function presentResults(results, formatters, locale = "en") {
    const localLabels = locale === "pt-PT" ? portugueseLabels : labels;
    const localNotes = locale === "pt-PT" ? portugueseNotes : constantNotes;
    return Object.fromEntries(Object.entries(results).map(([key, metric]) => {
      const helper = helpers[key];
      const note = helper ? noteFor(helper, metric.value, locale) : localNotes[key];
      const formatter = key === "numberNeededToScreen" ? formatters.formatNNS :
        ["dor", "lrPositive", "lrNegative"].includes(key) ? formatters.formatLikelihood : undefined;
      return [key, { ...metric, label: localLabels[key], note,
        interpretation: interpretation(key, metric.value), ...(formatter ? { formatter } : {}) }];
    }));
  }

  return { presentResults, interpretation, noteFor };
}));
