(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcGeometry = factory();
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), () => {
  const limit = Math.log(999);
  function logit(probability) {
    return Math.log(probability / (1 - probability));
  }
  function prePosition(probability) {
    return 0.5 + logit(probability) / (2 * limit);
  }
  function postPosition(probability) {
    return 0.5 - logit(probability) / (2 * limit);
  }
  function lrPosition(lr) {
    return 0.5 - Math.log(lr) / (4 * limit);
  }
  /** Normalised calibrated Fagan coordinates; off-scale values are not clipped. */
  function faganCoordinates(pre, lr, post) {
    const positions = { pre: prePosition(pre), lr: lrPosition(lr), post: postPosition(post) };
    return { ...positions, inRange: Object.values(positions).every((value) => Number.isFinite(value) && value >= 0 && value <= 1) };
  }
  return { prePosition, postPosition, lrPosition, faganCoordinates };
}));
