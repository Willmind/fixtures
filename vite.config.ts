import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cadDevPlugin } from "./scripts/cad-dev-plugin.ts";

export default defineConfig({
  plugins: [react(), cadDevPlugin()],
  server: { port: 5173, strictPort: true },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) =>
          id.includes("/node_modules/three/") ? "three" : undefined,
      },
    },
  },
});
