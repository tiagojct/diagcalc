// Development/test server: local assets only, no dependency or build step.
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(process.env.DIAGCALC_SITE_ROOT || path.join(__dirname, ".."));
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".woff2": "font/woff2" };
http.createServer((request, response) => {
  let pathname;
  try { pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname); }
  catch (_) { response.writeHead(400).end(); return; }
  if (pathname.includes("\u0000")) { response.writeHead(400).end(); return; }
  const target = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
  const relative = path.relative(root, target);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative) || !types[path.extname(target)]) {
    response.writeHead(404).end(); return;
  }
  fs.readFile(target, (error, content) => {
    if (error) { response.writeHead(404).end(); return; }
    response.writeHead(200, { "Content-Type": types[path.extname(target)], "Cache-Control": "no-store" });
    response.end(content);
  });
}).listen(Number(process.env.DIAGCALC_PORT || 8097), "127.0.0.1");
