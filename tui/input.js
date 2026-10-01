function sanitiseRawInput(fieldKey, rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  // Preserve complete input for strict parsing. Never turn -5 into 5 or 1.5 into 15.
  return rawValue.trim();
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

module.exports = { sanitiseRawInput, isAcceptedCharacter };
