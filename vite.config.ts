import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tanstackStart({ server: { entry: "server" } }),
    react(),
    tsconfigPaths(),
  ],
  // server: { middlewareMode: true }, // disabled to allow Vite to start an HTTP server
  build: {
    minify: "esbuild",
  },
});
