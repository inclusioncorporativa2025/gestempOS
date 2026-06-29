#!/usr/bin/env bash
# Wrapper: llama al script Node (no requiere jq ni stripe CLI)
#
#   export STRIPE_API_KEY=sk_live_...
#   bash backend/config/scripts/stripe_map_live_prices.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

if [[ -z "${STRIPE_API_KEY:-}" ]]; then
  echo "ERROR: export STRIPE_API_KEY=sk_live_..."
  exit 1
fi

node backend/scripts/stripe_map_live_prices.js
