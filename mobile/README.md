# Timecor — App móvil (Fase 0)

Cliente Android/iOS con **Expo** que consume el backend gestempOS (`/api/*`).

## Requisitos

- Node.js 20+
- Backend gestempOS en marcha (por defecto `http://localhost:5000`)
- [Expo Go](https://expo.dev/go) en el móvil o emulador Android

## Configuración

1. Copia `env.example` a `.env` en esta carpeta:

   ```bash
   cp env.example .env
   ```

2. Ajusta `EXPO_PUBLIC_API_BASE_URL`:

   | Entorno | URL típica |
   |---------|------------|
   | Emulador Android | `http://10.0.2.2:5000/api/` |
   | Dispositivo físico (misma WiFi) | `http://<IP-de-tu-PC>:5000/api/` |
   | Producción | `https://app.timecor.es/api/` |

3. Instala dependencias (si aún no):

   ```bash
   npm install
   ```

## Arrancar

```bash
npm start
```

- Pulsa `a` para abrir en emulador Android, o escanea el QR con Expo Go.

Tras cambiar `.env`, reinicia Metro (`npm start` de nuevo).

## Qué incluye la Fase 0

- Cliente HTTP con header `Authorization: Bearer` y `X-Client: timecor-mobile`
- Token JWT en **expo-secure-store**
- Pantallas: **Splash** (restaura sesión), **Login**, **Selección de empresa**, **Home** (placeholder)
- Flujo multi-empresa (`EMPRESA_SELECTION_REQUIRED` → `select-empresa`)

## Estructura

```
mobile/
├── App.js
├── app.config.js
├── src/
│   ├── api/          # client.js, authApi.js
│   ├── auth/         # session.js, AuthContext.jsx
│   ├── config/       # env.js
│   ├── navigation/
│   └── screens/
```

## Notas de desarrollo

- El backend escucha en `127.0.0.1`; para dispositivo físico necesitas que nginx/proxy exponga el API o usar túnel (ngrok, etc.).
- Si usas túnel SSH a MySQL, el backend sigue siendo local en el puerto configurado en `backend/.env` (`PORT`).

## Siguiente fase

Fase 1: pantalla **Fichar** (entrada/salida/pausa), GPS y overlay de pausa bloqueante.
