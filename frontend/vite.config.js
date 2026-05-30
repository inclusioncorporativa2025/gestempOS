import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// CRA -> Vite: el código fuente usa archivos .js con JSX y `process.env.REACT_APP_*`.
// Mantenemos compatibilidad sin renombrar archivos:
//  - esbuild trata los .js de /src como JSX
//  - `define` reemplaza la variable de entorno por su valor en tiempo de build
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://127.0.0.1:5000/api/';

  return {
    plugins: [react()],
    server: {
      port: 3000,
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
    },
    build: {
      outDir: 'build',
    },
  };
});
