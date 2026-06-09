import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  plugins: [react()],
  // Dev server runs as Express middleware (see server/agent.js); no standalone port / proxy needed.
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
