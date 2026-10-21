# IAMCOR + TimeCor (local)

Integración en `POST /api/auth/login` (sin cambios en el frontend).

## Variables (.env backend)

```env
IAMCOR_API_URL=http://localhost:5000/api/v1
IAMCOR_APP_CODE=TIMECOR
IAMCOR_INTEGRATION_SECRET=   # mismo valor que en IAMCOR backend
IAMCOR_BRIDGE_ENABLED=true   # false = solo bcrypt (ignora puente)
```

IAMCOR debe tener el mismo `IAMCOR_INTEGRATION_SECRET` y usuario `IAMCOR_INTEGRATION_GRANTED_BY_USER_ID` activo.

## Flujo

1. Usuario en `m_usuario_iamcor` → validación con `POST …/auth/login/app`.
2. Si IAM 401 y bcrypt OK → `POST …/integrations/provision-legacy-user` y enlace en puente.
3. Sin fila en puente → bcrypt como siempre (SaaS).
4. Tras credenciales OK → mismo JWT TimeCor (`emitirJwtSesionConHub`), selector de empresa, etc.

## Probar

1. IAMCOR `npm run dev` (puerto 5000).
2. gestempOS backend `npm run dev` (puerto 5001).
3. Login frontend o `POST http://127.0.0.1:5001/api/auth/login` con usuario puente + acceso TIMECOR en panel IAMCOR.
