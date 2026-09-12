import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

const multiplayerPort = Number(process.env.MUSCA_WS_PORT || 8081);
const base = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  base,
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 8080,
    proxy: {
      "/ws": {
        target: `ws://127.0.0.1:${multiplayerPort}`,
        ws: true,
      },
    },
  },
});
