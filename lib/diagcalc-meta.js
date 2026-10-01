(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcMeta = factory();
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), () => {
  return Object.freeze({ version: "5.1.0", schemaVersion: 2 });
}));
