function sanitiseRawInput(fieldKey, rawValue) {
  if (typeof rawValue !== "string") {
    return "";
  }

  // Preserve complete input for strict parsing. Never turn -5 into 5 or 1.5 into 15.
  return rawValue.trim();
}

// Escape braces before interpolating untrusted text into blessed widgets
// configured with tags:true. Without this, typing "{red-fg}" can recolour or
// hide subsequent terminal output.
function escapeTags(value) {
  return String(value).replace(/[{}]/g, (character) => character === "{" ? "{open}" : "{close}");
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

module.exports = { sanitiseRawInput, escapeTags, isAcceptedCharacter };
