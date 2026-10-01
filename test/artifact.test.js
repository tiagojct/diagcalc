const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, "..");

test("prepared Pages artifact includes every local asset, CNAME, and no terminal or repository files", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "diagcalc-site-"));
  try {
    const prepare = spawnSync(process.execPath, [path.join(root, "scripts/prepare-site.js"), temp], { encoding: "utf8" });
    assert.equal(prepare.status, 0, prepare.stderr);
    const html = fs.readFileSync(path.join(temp, "index.html"), "utf8");
    for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) {
      if (/^(https?:|mailto:)/.test(match[1])) continue;
      assert.ok(fs.existsSync(path.join(temp, match[1])), `Missing shipped asset: ${match[1]}`);
    }
    assert.equal(fs.readFileSync(path.join(temp, "CNAME"), "utf8"), fs.readFileSync(path.join(root, "CNAME"), "utf8"));
    for (const name of ["tui", "bin", ".git", "node_modules"]) assert.equal(fs.existsSync(path.join(temp, name)), false);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

test("packed npm package runs the CLI and includes the web, shared modules and terminal adapters", () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "diagcalc-package-"));
  try {
    const packed = spawnSync("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", temp], {
      cwd: root, encoding: "utf8", env: { ...process.env, npm_config_cache: path.join(temp, "cache") },
    });
    assert.equal(packed.status, 0, packed.stderr);
    const artifact = JSON.parse(packed.stdout)[0];
    const files = new Set(artifact.files.map((file) => file.path));
    for (const file of ["web/charts.js", "web/results.js", "tui/input.js", "tui/report.js", "lib/diagcalc-meta.js", "lib/diagcalc-types.d.ts"]) {
      assert.ok(files.has(file), `Package is missing ${file}`);
    }
    const extracted = spawnSync("tar", ["-xzf", path.join(temp, artifact.filename), "-C", temp], { encoding: "utf8" });
    assert.equal(extracted.status, 0, extracted.stderr);
    const result = spawnSync(process.execPath, [path.join(temp, "package/bin/diagcalc.js"), "--dataset", "ddimer", "--format", "json"], { cwd: temp, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).schemaVersion, 2);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});
