import http from "node:http";
import { spawn } from "node:child_process";
import { attachMultiplayer } from "./room-server.mjs";

const WS_PORT = Number(process.env.MUSCA_WS_PORT || 8081);
const WEB_PORT = Number(process.env.MUSCA_WEB_PORT || 8080);
const server = http.createServer((req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "musca-multiplayer" }));
    return;
  }
  res.writeHead(404); res.end("Not found");
});
attachMultiplayer(server);
server.listen(WS_PORT, "0.0.0.0", () => console.log(`[MUSCA] WebSocket de desenvolvimento em ws://0.0.0.0:${WS_PORT}/ws`));

console.log(`[MUSCA] Iniciando Vite em http://localhost:${WEB_PORT} ...`);
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";
const vite = spawn(npmCmd, ["run", "dev", "--", "--port", String(WEB_PORT)], { stdio: "inherit", shell: false, env: { ...process.env, MUSCA_WS_PORT: String(WS_PORT) } });
const shutdown = () => { try { vite.kill(); } catch {} try { server.close(); } catch {} process.exit(0); };
process.on("SIGINT", shutdown); process.on("SIGTERM", shutdown);
vite.on("exit", (code) => { if (code && code !== 0) console.error(`[MUSCA] Vite encerrou com código ${code}.`); });
