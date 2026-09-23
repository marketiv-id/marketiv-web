#!/usr/bin/env bash
# set-env-all-functions.sh
# Set environment variable APPWRITE_API_KEY di semua function.
#
# Prasyarat:
#   - appwrite CLI terinstall dan login
#   - API key sudah dibuat di Console > API Keys dengan scopes:
#     documents.read, documents.write, files.read, files.write,
#     users.read, messages.write
#
# Penggunaan:
#   APPWRITE_API_KEY=<key-value> bash 00_BACKEND/scripts/set-env-all-functions.sh

set -euo pipefail

API_KEY="${APPWRITE_API_KEY:-}"
if [ -z "$API_KEY" ]; then
  echo "❌ APPWRITE_API_KEY tidak diset. Jalankan:"
  echo "   APPWRITE_API_KEY=<key-value> bash $0"
  exit 1
fi

FUNCTIONS=(
  create-user-profile
  create-user-wallet
  validate-and-upload
  delete-file
  campaign-published
  campaign-claimed
  expire-stale-claims
  ai-brief
  ai-fraud-precheck
  calculate-campaign-reward
  create-order
  create-payment
  cancel-payment
  midtrans-webhook
  create-escrow
  release-escrow
  send-chat-notification
  get-umkm-dashboard-summary
  get-umkm-finance-summary
  get-umkm-profile
  get-creator-directory
  get-creator-profile
  get-creator-dashboard-summary
  get-creator-negotiations
  update-profile
)

TOTAL=${#FUNCTIONS[@]}
CURRENT=0
FAILED=()

echo "============================================"
echo "  Set APPWRITE_API_KEY ($TOTAL functions)"
echo "============================================"
echo ""

set_var() {
  local fn="$1"

  CURRENT=$((CURRENT + 1))

  # Cek apakah variable sudah ada
  EXISTING=$(appwrite functions list-variables --function-id "$fn" 2>/dev/null | rtk rg '"APPWRITE_API_KEY"' || true)

  if [ -n "$EXISTING" ]; then
    echo "[$CURRENT/$TOTAL] $fn — SKIP (APPWRITE_API_KEY sudah ada)"
    return
  fi

  echo "[$CURRENT/$TOTAL] $fn — Menambahkan APPWRITE_API_KEY..."

  if appwrite functions create-variable \
    --function-id "$fn" \
    --variable-id "APPWRITE_API_KEY" \
    --key "APPWRITE_API_KEY" \
    --value "$API_KEY" \
    --secret true 2>&1; then
    echo "  [OK] $fn"
  else
    echo "  [FAIL] $fn"
    FAILED+=("$fn")
  fi
  echo ""
}

for fn in "${FUNCTIONS[@]}"; do
  set_var "$fn"
done

echo "============================================"
echo "  Summary: $((TOTAL - ${#FAILED[@]}))/$TOTAL OK"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "  Failed: ${FAILED[*]}"
fi
echo "============================================"
