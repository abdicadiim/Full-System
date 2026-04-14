import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "tailwindcss";
import autoprefixer from "autoprefixer";

const DEFAULT_BACKEND_ORIGIN = "http://127.0.0.1:5000";

const resolveBackendOrigin = (value?: string) => {
  const raw = String(value || "").trim();
  if (!raw) return DEFAULT_BACKEND_ORIGIN;

  try {
    return new URL(raw, DEFAULT_BACKEND_ORIGIN).origin;
  } catch {
    return DEFAULT_BACKEND_ORIGIN;
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const backendOrigin = resolveBackendOrigin(env.VITE_API_ORIGIN || env.VITE_API_URL);

  return {
    plugins: [react()],
    css: {
      postcss: {
        plugins: [tailwindcss(), autoprefixer()],
      },
    },
    server: {
      port: 5172,
      proxy: {
        "/api": {
          target: backendOrigin,
          changeOrigin: true,
        },
      },
    },
  };
});
