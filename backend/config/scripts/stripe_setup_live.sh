#!/usr/bin/env bash
# =============================================================================
# Timecor — Crear productos y precios en Stripe LIVE (solo si NO existen aún)
#
# Si ya tienes productos en el Dashboard (Timecor_Esencial_Mes, etc.),
# usa en su lugar: stripe_map_live_prices.sh
#
# Uso:
#   1. Dashboard Stripe → modo LIVE (toggle arriba a la derecha)
#   2. export STRIPE_API_KEY=sk_live_...
#   3. bash backend/config/scripts/stripe_setup_live.sh
#
# Importes (por licencia / usuario, sin IVA):
#   Esencial  mensual  2,50 €/mes  |  anual  30,00 €/año (antes del cupón)
#   RRHH      mensual  3,90 €/mes  |  anual  46,80 €/año
#   Completo  mensual  5,90 €/mes  |  anual  70,80 €/año
#
# El cupón anual aplica ~16,67 % (2 meses gratis de 12) en el primer pago.
# Tras ejecutar, copia los price_... al final del script en MySQL (tabla planes).
# =============================================================================

set -euo pipefail

if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  echo "ERROR: define STRIPE_API_KEY=sk_live_... antes de ejecutar."
  exit 1
fi

if [[ "${STRIPE_API_KEY}" != sk_live_* ]]; then
  echo "AVISO: la clave no empieza por sk_live_ — ¿estás en modo test?"
  read -r -p "Continuar igualmente? [y/N] " ok
  [[ "${ok,,}" == "y" ]] || exit 1
fi

stripe_api() {
  stripe "$@" --api-key "$STRIPE_API_KEY"
}

echo "==> 1/4 Productos LIVE"
PROD_ESENCIAL=$(stripe_api products create \
  -d name="Timecor Esencial" \
  -d description="Control horario: fichaje, cierres, bolsa de horas e informes." \
  -d "metadata[codigo]=esencial" \
  --format json | jq -r .id)

PROD_RRHH=$(stripe_api products create \
  -d name="Timecor RRHH" \
  -d description="Esencial + vacaciones, nóminas y multiempresa." \
  -d "metadata[codigo]=rrhh" \
  --format json | jq -r .id)

PROD_COMPLETO=$(stripe_api products create \
  -d name="Timecor Completo" \
  -d description="RRHH + fichaje WhatsApp e informes de productividad." \
  -d "metadata[codigo]=completo" \
  --format json | jq -r .id)

echo "    prod esencial:  $PROD_ESENCIAL"
echo "    prod rrhh:      $PROD_RRHH"
echo "    prod completo:  $PROD_COMPLETO"

echo ""
echo "==> 2/4 Precios mensuales (recurring month)"
PRICE_ESENCIAL_M=$(stripe_api prices create \
  -d product="$PROD_ESENCIAL" \
  -d unit_amount=250 \
  -d currency=eur \
  -d "recurring[interval]=month" \
  -d "metadata[codigo]=esencial" \
  -d "metadata[ciclo]=mensual" \
  --format json | jq -r .id)

PRICE_RRHH_M=$(stripe_api prices create \
  -d product="$PROD_RRHH" \
  -d unit_amount=390 \
  -d currency=eur \
  -d "recurring[interval]=month" \
  -d "metadata[codigo]=rrhh" \
  -d "metadata[ciclo]=mensual" \
  --format json | jq -r .id)

PRICE_COMPLETO_M=$(stripe_api prices create \
  -d product="$PROD_COMPLETO" \
  -d unit_amount=590 \
  -d currency=eur \
  -d "recurring[interval]=month" \
  -d "metadata[codigo]=completo" \
  -d "metadata[ciclo]=mensual" \
  --format json | jq -r .id)

echo "    price esencial mensual:  $PRICE_ESENCIAL_M"
echo "    price rrhh mensual:      $PRICE_RRHH_M"
echo "    price completo mensual:  $PRICE_COMPLETO_M"

echo ""
echo "==> 3/4 Precios anuales (recurring year, importe bruto antes del cupón)"
PRICE_ESENCIAL_A=$(stripe_api prices create \
  -d product="$PROD_ESENCIAL" \
  -d unit_amount=3000 \
  -d currency=eur \
  -d "recurring[interval]=year" \
  -d "metadata[codigo]=esencial" \
  -d "metadata[ciclo]=anual" \
  --format json | jq -r .id)

PRICE_RRHH_A=$(stripe_api prices create \
  -d product="$PROD_RRHH" \
  -d unit_amount=4680 \
  -d currency=eur \
  -d "recurring[interval]=year" \
  -d "metadata[codigo]=rrhh" \
  -d "metadata[ciclo]=anual" \
  --format json | jq -r .id)

PRICE_COMPLETO_A=$(stripe_api prices create \
  -d product="$PROD_COMPLETO" \
  -d unit_amount=7080 \
  -d currency=eur \
  -d "recurring[interval]=year" \
  -d "metadata[codigo]=completo" \
  -d "metadata[ciclo]=anual" \
  --format json | jq -r .id)

echo "    price esencial anual:  $PRICE_ESENCIAL_A"
echo "    price rrhh anual:      $PRICE_RRHH_A"
echo "    price completo anual:  $PRICE_COMPLETO_A"

echo ""
echo "==> 4/4 Cupón anual (2 meses gratis ≈ 16,67 %, solo primer pago)"
stripe_api coupons create \
  -d id=timecor_anual_2meses_gratis_v2 \
  -d percent_off=16.67 \
  -d duration=once \
  -d name="2 meses gratis plan anual" \
  2>/dev/null || echo "    (cupón timecor_anual_2meses_gratis_v2 ya existe — OK)"

echo ""
echo "=============================================================================="
echo "SQL para MySQL (pega en prod tras sustituir si hace falta):"
echo "=============================================================================="
cat <<SQL
UPDATE planes SET
  stripe_price_id_mensual = '$PRICE_ESENCIAL_M',
  stripe_price_id_anual   = '$PRICE_ESENCIAL_A'
WHERE codigo = 'esencial';

UPDATE planes SET
  stripe_price_id_mensual = '$PRICE_RRHH_M',
  stripe_price_id_anual   = '$PRICE_RRHH_A'
WHERE codigo = 'rrhh';

UPDATE planes SET
  stripe_price_id_mensual = '$PRICE_COMPLETO_M',
  stripe_price_id_anual   = '$PRICE_COMPLETO_A'
WHERE codigo = 'completo';

SELECT codigo, stripe_price_id_mensual, stripe_price_id_anual FROM planes;
SQL

echo ""
echo "Variables .env prod:"
echo "  STRIPE_COUPON_ANUAL=timecor_anual_2meses_gratis_v2"
echo ""
echo "Listo. Revisa en Dashboard → Products que los 6 precios son LIVE."
