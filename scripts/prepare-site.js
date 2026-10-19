const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const output = path.resolve(process.argv[2] || path.join(root, "public"));

// A clean build prevents stale assets from a previous checkout or branch from
// being deployed. Refuse outputs that contain the repository (for example `/`
// or the repository root) before deleting anything.
const toRoot = path.relative(output, root);
if (!toRoot || path.isAbsolute(toRoot) || !toRoot.startsWith("..")) {
  throw new Error(`Refusing to clean unsafe output directory: ${output}`);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const asset of ["index.html", "script.js", "styles.css", "CNAME", "lib", "web"]) {
  fs.cpSync(path.join(root, asset), path.join(output, asset), { recursive: true });
}
