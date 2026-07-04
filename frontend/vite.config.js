import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// CRA -> Vite: el código fuente usa archivos .js con JSX y `process.env.REACT_APP_*`.
// Mantenemos compatibilidad sin renombrar archivos:
//  - esbuild trata los .js de /src como JSX
//  - `define` reemplaza la variable de entorno por su valor en tiempo de build
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isProd = mode === 'production';
  const apiBaseUrl =
    env.VITE_API_BASE_URL ||
    (isProd ? '/api/' : 'http://127.0.0.1:5000/api/');
  const appUrl =
    env.VITE_APP_URL ||
    (isProd ? 'https://app.timecor.es' : 'http://localhost:3000');
  const landingUrl = env.VITE_LANDING_URL || 'https://timecor.es';

  const landingApiBaseUrl =
    env.VITE_LANDING_API_BASE_URL
    || apiBaseUrl
    || (isProd ? 'https://app.timecor.es/api/' : 'http://127.0.0.1:5000/api/');
  const calendlyDemoUrl =
    env.VITE_CALENDLY_DEMO_URL
    || 'https://calendly.com/inclusioncorporativa-info/timecor-demo';

  return {
    plugins: [react()],
    server: {
      port: Number(env.VITE_DEV_PORT) || 3001,
      open: true,
    },
    esbuild: {
      loader: 'jsx',
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      esbuildOptions: {
        loader: { '.js': 'jsx' },
      },
    },
    define: {
      'process.env.REACT_APP_API_BASE_URL': JSON.stringify(apiBaseUrl),
      'process.env.NODE_ENV': JSON.stringify(mode),
      'import.meta.env.VITE_APP_URL': JSON.stringify(appUrl),
      'import.meta.env.VITE_LANDING_URL': JSON.stringify(landingUrl),
      'import.meta.env.VITE_API_BASE_URL': JSON.stringify(apiBaseUrl),
      'import.meta.env.VITE_LANDING_API_BASE_URL': JSON.stringify(landingApiBaseUrl),
      'import.meta.env.VITE_CALENDLY_DEMO_URL': JSON.stringify(calendlyDemoUrl),
    },
    build: {
      outDir: 'build',
    },
  };
});
