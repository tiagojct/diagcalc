const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");

test("real TUI validates prompts, preserves exact chaining, protects exports and restores terminal", {
  skip: process.platform === "win32", timeout: 30000,
}, () => {
  const result = spawnSync("python3", [path.join(__dirname, "../scripts/tests/tui-session.py"), process.execPath], {
    encoding: "utf8", timeout: 28000,
  });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  assert.equal(JSON.parse(result.stdout).exactChaining, true);
});
