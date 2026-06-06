import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const webDir = path.join(root, "web");
const functionDir = path.join(root, "netlify", "functions");
const port = Number(process.env.PORT || 8765);

const apiMap = {
  "/api/articles": "articles.mjs",
  "/api/briefing": "briefing.mjs",
  "/api/sources": "sources.mjs",
  "/api/refresh": "refresh.mjs",
  "/api/status": "status.mjs",
  "/.netlify/functions/articles": "articles.mjs",
  "/.netlify/functions/briefing": "briefing.mjs",
  "/.netlify/functions/sources": "sources.mjs",
  "/.netlify/functions/refresh": "refresh.mjs",
  "/.netlify/functions/status": "status.mjs",
};

const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (apiMap[url.pathname]) {
      await serveFunction(req, res, url);
      return;
    }
    await serveStatic(res, url.pathname);
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ ok: false, message: error.message }));
  }
}).listen(port, "127.0.0.1", () => {
  console.log(`客运情报站本地预览已启动：http://127.0.0.1:${port}`);
});

async function serveFunction(req, res, url) {
  const file = apiMap[url.pathname];
  const mod = await import(`${pathToFileURL(path.join(functionDir, file)).href}?v=${Date.now()}`);
  const queryStringParameters = Object.fromEntries(url.searchParams.entries());
  const event = {
    httpMethod: req.method,
    path: url.pathname,
    queryStringParameters,
    body: await readBody(req),
  };
  const result = await mod.handler(event, {});
  res.writeHead(result.statusCode || 200, result.headers || {});
  res.end(result.body || "");
}

async function serveStatic(res, pathname) {
  const safePath = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const target = path.resolve(webDir, safePath);
  if (!target.startsWith(path.resolve(webDir))) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  try {
    const data = await fs.readFile(target);
    res.writeHead(200, { "Content-Type": mime[path.extname(target)] || "application/octet-stream" });
    res.end(data);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

