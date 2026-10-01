const fs = require("node:fs");
const path = require("node:path");
const output = path.resolve(process.argv[2] || "public");
fs.mkdirSync(output, { recursive: true });
for (const asset of ["index.html", "script.js", "styles.css", "CNAME", "lib", "web"]) {
  fs.cpSync(path.resolve(__dirname, "..", asset), path.join(output, asset), { recursive: true });
}
