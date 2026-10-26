import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";

  return {
    plugins: [react()],

    // Use /hirams/ ONLY in production
    base: isProduction ? "/hirams/" : "/",

    build: {
      // Raise the warning limit so the intentional vendor chunk (661 kB)
      // doesn't trigger the warning. Optional.
      chunkSizeWarningLimit: 700,

      rollupOptions: {
        output: {
          // Merge tiny chunks (< ~10 kB) into neighbors to cut file count
          experimentalMinChunkSize: 10_000,

          // Stable vendor chunk: React + MUI
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            const p = id.replace(/\\/g, "/");
            if (
              /\/(react|react-dom|react-router|react-router-dom|scheduler|react-is|@mui|@emotion|prop-types|hoist-non-react-statics)\//.test(
                p,
              )
            )
              return "vendor-react-mui";
            return undefined;
          },
        },
      },
    },

    // Dev-only proxy (removed automatically in production)
    server: isProduction
      ? undefined
      : {
          proxy: {
            // Media must be matched BEFORE /api — it goes to the LOCAL
            // backend, not the production one below. Serving images
            // same-origin through the proxy avoids CORS, Firefox's
            // local-network restrictions, and NS_ERROR_DOM_NETWORK_ERR
            // races with PHP's built-in dev server entirely.
            "/api/media": {
              target: "http://127.0.0.1:8000",
              changeOrigin: true,
            },
            "/api": {
              target: "https://lgu.net.ph/apiHirams/public",
              changeOrigin: true,
              rewrite: (path) => path.replace(/^\/api/, ""),
            },
          },
        },
  };
});