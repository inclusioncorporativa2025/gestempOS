#!/usr/bin/env bash
# Descubre variables OpenWA para Timecor.
# Ejecutar EN EL VPS donde está OpenWA (misma máquina que el backend).
#
# Uso:
#   chmod +x backend/scripts/openwa_discover_vars.sh
#   ./backend/scripts/openwa_discover_vars.sh
#
# Opcional:
#   OPENWA_BASE_URL=http://127.0.0.1:2785 ./backend/scripts/openwa_discover_vars.sh

set -euo pipefail

BASE="${OPENWA_BASE_URL:-http://127.0.0.1:2785}"
BASE="${BASE%/}"
API_PREFIX="${BASE}/api"
WEBHOOK_PUBLIC="${OPENWA_WEBHOOK_PUBLIC_URL:-https://app.timecor.es}"

echo "=== OpenWA · descubrimiento de variables ==="
echo "Base URL probada: $BASE"
echo ""

# --- 1) API KEY ---
API_KEY=""
for path in \
  "./data/.api-key" \
  "/app/data/.api-key" \
  "$HOME/OpenWA/data/.api-key" \
  "/opt/OpenWA/data/.api-key"
do
  if [[ -f "$path" ]]; then
    API_KEY="$(tr -d '[:space:]' < "$path")"
    echo "✓ API key leída de: $path"
    break
  fi
done

if [[ -z "$API_KEY" ]] && command -v docker >/dev/null 2>&1; then
  CONTAINER="$(docker ps --format '{{.Names}}' | grep -iE 'openwa|owa' | head -1 || true)"
  if [[ -n "$CONTAINER" ]]; then
    API_KEY="$(docker exec "$CONTAINER" cat /app/data/.api-key 2>/dev/null | tr -d '[:space:]' || true)"
    [[ -n "$API_KEY" ]] && echo "✓ API key leída del contenedor Docker: $CONTAINER"
  fi
fi

if [[ -z "$API_KEY" ]]; then
  echo "✗ No se encontró data/.api-key"
  echo "  · Revisa los logs de arranque de OpenWA (imprime la clave la primera vez)"
  echo "  · O entra al dashboard: ${BASE}/"
  echo "  · O crea una clave: POST ${API_PREFIX}/auth/api-keys (con clave admin)"
  API_KEY="REEMPLAZAR"
fi

# --- 2) Health / sesiones ---
echo ""
echo "--- Comprobando API ---"
if curl -sf -H "X-API-Key: $API_KEY" "${API_PREFIX}/health" >/dev/null 2>&1; then
  echo "✓ OpenWA responde en ${API_PREFIX}/health"
else
  echo "⚠ No responde ${API_PREFIX}/health"
  echo "  Prueba otros puertos/URLs, p. ej.:"
  echo "    OPENWA_BASE_URL=http://127.0.0.1:2785 $0"
  echo "    OPENWA_BASE_URL=https://wa.timecor.es $0"
fi

SESSIONS_JSON=""
if [[ "$API_KEY" != "REEMPLAZAR" ]]; then
  SESSIONS_JSON="$(curl -sf -H "X-API-Key: $API_KEY" "${API_PREFIX}/sessions" 2>/dev/null || echo '[]')"
fi

SESSION_ID=""
SESSION_STATUS=""
if command -v python3 >/dev/null 2>&1 && [[ -n "$SESSIONS_JSON" ]]; then
  read -r SESSION_ID SESSION_STATUS <<< "$(python3 - <<PY
import json, sys
try:
    data = json.loads('''$SESSIONS_JSON''')
except Exception:
    data = []
if not data:
    print(' ')
    sys.exit(0)
# Preferir sesión ready; si no, la primera
ready = next((s for s in data if s.get('status') == 'ready'), None)
s = ready or data[0]
print(s.get('id',''), s.get('status',''))
PY
)"
fi

if [[ -n "${SESSION_ID// }" ]]; then
  echo "✓ Sesión encontrada: $SESSION_ID (estado: ${SESSION_STATUS:-?})"
else
  echo "✗ No hay sesiones. Créala con:"
  echo "  curl -X POST ${API_PREFIX}/sessions -H 'X-API-Key: \$OPENWA_API_KEY' -H 'Content-Type: application/json' -d '{\"name\":\"timecor\"}'"
  SESSION_ID="REEMPLAZAR"
fi

# --- 3) Webhook secret (generar uno nuevo) ---
WEBHOOK_SECRET="$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p -c 64)"
WEBHOOK_URL="${WEBHOOK_PUBLIC%/}/api/whatsapp/webhook"

echo ""
echo "=== Copia esto en backend/.env (VPS y local si aplica) ==="
echo ""
cat <<EOF
# OpenWA — generado $(date -Iseconds 2>/dev/null || date)
OPENWA_BASE_URL=${BASE}
OPENWA_API_KEY=${API_KEY}
OPENWA_SESSION_ID=${SESSION_ID}
OPENWA_WEBHOOK_SECRET=${WEBHOOK_SECRET}
OPENWA_WEBHOOK_PUBLIC_URL=${WEBHOOK_PUBLIC}
EOF

echo ""
echo "=== URL del webhook (registrar en OpenWA) ==="
echo "$WEBHOOK_URL"
echo ""
echo "=== Registrar webhook (cuando SESSION esté 'ready') ==="
echo "curl -X POST '${API_PREFIX}/sessions/${SESSION_ID}/webhooks' \\"
echo "  -H 'X-API-Key: ${API_KEY}' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"url\":\"${WEBHOOK_URL}\",\"secret\":\"${WEBHOOK_SECRET}\",\"events\":[\"message.received\"]}'"
echo ""
echo "Dashboard OpenWA: ${BASE}/"
echo "Swagger:          ${API_PREFIX}/docs"
