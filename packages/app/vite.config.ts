import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "VITE_");

  return {
    plugins: [react(), tailwindcss()],
    server: {
      port: 5173,
      ...(env.VITE_WATCH_POLLING === "true"
        ? { watch: { usePolling: true, interval: 300 } }
        : {}),
    },
    preview: { port: 4173 },
  };
});
