(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.DiagcalcStorage = factory();
}(/** @type {any} */ (typeof globalThis !== "undefined" ? globalThis : this), () => {
  /**
   * Storage failures must never prevent calculation. Written values take
   * precedence over the backend, including after quota or access failures.
   * @param {() => Storage} getBackend Lazy access also guards SecurityError getters.
   */
  function createStorage(getBackend) {
    const memory = new Map();
    return {
      /** @param {string} key @returns {string | null} */
      getItem(key) {
        if (memory.has(key)) return memory.get(key);
        try {
          return getBackend().getItem(key);
        } catch (_) {
          return null;
        }
      },
      /** @param {string} key @param {string} value */
      setItem(key, value) {
        const text = String(value);
        memory.set(key, text);
        try {
          getBackend().setItem(key, text);
        } catch (_) {
          // Continue with the session's in-memory history/preferences.
        }
      },
      /** @param {string} key */
      removeItem(key) {
        memory.set(key, null);
        try {
          getBackend().removeItem(key);
        } catch (_) {}
      },
    };
  }
  return { createStorage };
}));
