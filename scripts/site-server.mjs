import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";
import { attachMultiplayer } from "./room-server.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../dist");
const PORT = Number(process.env.PORT || process.env.MUSCA_WEB_PORT || 8080);
const HOST = process.env.HOST || "0.0.0.0";

const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".glb": "model/gltf-binary",
  ".gltf": "model/gltf+json",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".wav": "audio/wav",
  ".woff2": "font/woff2",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

const compressible = new Set([".html", ".js", ".css", ".json", ".svg", ".webmanifest", ".txt"]);

function securityHeaders() {
  return {
    "x-content-type-options": "nosniff",
    "x-frame-options": "SAMEORIGIN",
    "referrer-policy": "strict-origin-when-cross-origin",
    "permissions-policy": "camera=(), microphone=(), geolocation=()",
    "cross-origin-resource-policy": "same-origin",
  };
}

function cacheControl(filePath) {
  const base = path.basename(filePath);
  if (base === "index.html" || base === "site.webmanifest") return "no-cache";
  if (filePath.includes(`${path.sep}assets${path.sep}`) && /-[A-Za-z0-9_-]{6,}\./.test(base)) {
    return "public, max-age=31536000, immutable";
  }
  if (filePath.includes(`${path.sep}assets${path.sep}`)) return "public, max-age=86400";
  return "public, max-age=3600";
}

function sendFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      ...securityHeaders(),
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": cacheControl(filePath),
      "vary": "Accept-Encoding",
    };

    const accepts = String(req.headers["accept-encoding"] || "");
    const canCompress = compressible.has(ext) && stat.size > 1024;
    if (canCompress && accepts.includes("br")) {
      res.writeHead(200, { ...headers, "content-encoding": "br" });
      fs.createReadStream(filePath).pipe(zlib.createBrotliCompress()).pipe(res);
      return;
    }
    if (canCompress && accepts.includes("gzip")) {
      res.writeHead(200, { ...headers, "content-encoding": "gzip" });
      fs.createReadStream(filePath).pipe(zlib.createGzip()).pipe(res);
      return;
    }

    res.writeHead(200, { ...headers, "content-length": stat.size });
    fs.createReadStream(filePath).pipe(res);
  });
}

if (!fs.existsSync(root)) {
  console.error("[MUSCA] dist/ não encontrado. Execute `npm run build` antes de `npm start`.");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.writeHead(405, { ...securityHeaders(), allow: "GET, HEAD" });
    res.end();
    return;
  }

  if (req.url === "/health" || req.url?.startsWith("/health?")) {
    res.writeHead(200, {
      ...securityHeaders(),
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    });
    res.end(JSON.stringify({ ok: true, service: "musca-site", multiplayer: true }));
    return;
  }

  let pathname = "/";
  try {
    pathname = decodeURIComponent(new URL(req.url || "/", "http://localhost").pathname);
  } catch {
    res.writeHead(400, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
    res.end("Bad request");
    return;
  }

  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const resolved = path.resolve(root, relative);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) {
    res.writeHead(403, { ...securityHeaders(), "content-type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.stat(resolved, (err, stat) => {
    if (!err && stat.isFile()) {
      if (req.method === "HEAD") {
        res.writeHead(200, {
          ...securityHeaders(),
          "content-type": types[path.extname(resolved).toLowerCase()] || "application/octet-stream",
          "cache-control": cacheControl(resolved),
          "content-length": stat.size,
        });
        res.end();
        return;
      }
      sendFile(req, res, resolved);
      return;
    }
    if (req.method === "HEAD") {
      res.writeHead(200, { ...securityHeaders(), "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" });
      res.end();
      return;
    }
    sendFile(req, res, path.join(root, "index.html"));
  });
});

const multiplayer = attachMultiplayer(server);

server.listen(PORT, HOST, () => {
  console.log(`[MUSCA] Site + multiplayer ativos em ${HOST}:${PORT}`);
  console.log("[MUSCA] WebSocket disponível em /ws (ws:// ou wss:// automaticamente no cliente)");
});

function shutdown(signal) {
  console.log(`[MUSCA] ${signal}: encerrando servidor...`);
  multiplayer.close?.();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
