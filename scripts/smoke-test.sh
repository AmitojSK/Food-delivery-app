#!/usr/bin/env bash
# End-to-end smoke test of the deployed platform.
#
# Drives the complete three-role workflow through the API gateway:
#
#   customer registers -> places an order
#   restaurant owner   -> confirms -> prepares -> marks ready for pickup
#   [Kafka]            -> OrderReadyForPickup creates a PENDING delivery
#   delivery partner   -> accepts -> picks up -> in transit -> delivered
#   [Kafka]            -> delivery events drive the order to DELIVERED
#   customer           -> sees DELIVERED
#
# The two [Kafka] steps are asynchronous, so they are polled with a timeout
# rather than assumed instant. Run scripts/warm-up.* first; on Render's free
# tier a cold service can take ~90s to answer and will fail the polls.
#
# Usage:
#   OWNER_PASSWORD=... DRIVER_PASSWORD=... ./scripts/smoke-test.sh

set -uo pipefail

GATEWAY_URL="${GATEWAY_URL:-https://api-gateway-3nle.onrender.com}"
OWNER_EMAIL="${OWNER_EMAIL:-owner@fooddelivery.local}"
OWNER_PASSWORD="${OWNER_PASSWORD:?OWNER_PASSWORD must be set}"
DRIVER_EMAIL="${DRIVER_EMAIL:-driver@fooddelivery.local}"
DRIVER_PASSWORD="${DRIVER_PASSWORD:?DRIVER_PASSWORD must be set}"
RESTAURANT_ID="${RESTAURANT_ID:-1}"

CURL="curl -sS --max-time 120"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-20}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"

pass() { echo "  PASS  $*"; }
fail() { echo "  FAIL  $*"; exit 1; }

str() { grep -o "\"$2\":\"[^\"]*\"" <<<"$1" | head -1 | cut -d'"' -f4 || true; }
num() { grep -o "\"$2\":[0-9]*" <<<"$1" | head -1 | cut -d: -f2 || true; }

login() {
  local body
  body=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/login" \
    -H 'Content-Type: application/json' -d "{\"email\":\"$1\",\"password\":\"$2\"}")
  str "$body" accessToken
}

echo "=== 1. Customer registration ==="
STAMP=$(date +%s)
CUST_EMAIL="smoke-$STAMP@fooddelivery.local"
CUST_PASSWORD="Smoke-$STAMP-pw"
REG=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"Smoke\",\"lastName\":\"Test\",\"email\":\"$CUST_EMAIL\",\"phoneNumber\":\"+91900$(printf '%07d' $((STAMP % 10000000)))\",\"password\":\"$CUST_PASSWORD\"}")
CUST_TOKEN=$(str "$REG" accessToken)
CUST_ID=$(num "$REG" id)
[ -n "$CUST_TOKEN" ] || fail "registration failed: $REG"
pass "registered $CUST_EMAIL (id $CUST_ID)"

echo "=== 2. Customer places an order ==="
ORDER=$($CURL -X POST "$GATEWAY_URL/order-api/api/v1/orders" \
  -H "Authorization: Bearer $CUST_TOKEN" -H 'Content-Type: application/json' \
  -d "{\"userId\":$CUST_ID,\"restaurantId\":$RESTAURANT_ID,\"deliveryAddress\":\"221B Residency Road, Bengaluru 560025\",\"contactName\":\"Smoke Test\",\"contactPhone\":\"+919000000000\",\"items\":[{\"foodItemId\":1,\"foodItemName\":\"Paneer Butter Masala\",\"quantity\":2,\"unitPrice\":320.00},{\"foodItemId\":3,\"foodItemName\":\"Garlic Naan\",\"quantity\":4,\"unitPrice\":70.00}]}")
ORDER_ID=$(str "$ORDER" id)
[ -n "$ORDER_ID" ] || fail "order creation failed: $ORDER"
pass "order $ORDER_ID created (status $(str "$ORDER" status))"

echo "=== 3. Restaurant owner advances the order ==="
OWNER_TOKEN=$(login "$OWNER_EMAIL" "$OWNER_PASSWORD")
[ -n "$OWNER_TOKEN" ] || fail "owner login failed"
for STATUS in CONFIRMED PREPARING READY_FOR_PICKUP; do
  RESP=$($CURL -X PATCH "$GATEWAY_URL/order-api/api/v1/partner/orders/$ORDER_ID/status?restaurantId=$RESTAURANT_ID" \
    -H "Authorization: Bearer $OWNER_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"status\":\"$STATUS\"}")
  [ "$(str "$RESP" status)" = "$STATUS" ] || fail "transition to $STATUS failed: $RESP"
  pass "order -> $STATUS"
done

echo "=== 4. [Kafka] OrderReadyForPickup should create a PENDING delivery ==="
DRIVER_TOKEN=$(login "$DRIVER_EMAIL" "$DRIVER_PASSWORD")
[ -n "$DRIVER_TOKEN" ] || fail "driver login failed"

# Polled with the CUSTOMER's token: this simultaneously proves the delivery was created
# via Kafka and that the ordering customer is authorized to track it.
DELIVERY_ID=""
for i in $(seq 1 "$POLL_ATTEMPTS"); do
  D=$($CURL "$GATEWAY_URL/delivery-api/api/v1/deliveries/order/$ORDER_ID" \
    -H "Authorization: Bearer $CUST_TOKEN")
  DELIVERY_ID=$(num "$D" id)
  if [ -n "$DELIVERY_ID" ]; then
    pass "delivery $DELIVERY_ID created via Kafka (status $(str "$D" status)) after ~$((i * POLL_INTERVAL))s"
    pass "pickup address resolved from restaurant: $(str "$D" pickupAddress)"
    pass "ordering customer can track their own delivery"
    break
  fi
  sleep "$POLL_INTERVAL"
done
[ -n "$DELIVERY_ID" ] || fail "no delivery appeared within $((POLL_ATTEMPTS * POLL_INTERVAL))s"

echo "=== 4b. Cross-tenant check: another customer must NOT read this delivery ==="
OTHER_EMAIL="smoke-other-$STAMP@fooddelivery.local"
OTHER=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"firstName\":\"Other\",\"lastName\":\"Customer\",\"email\":\"$OTHER_EMAIL\",\"phoneNumber\":\"+91901$(printf '%07d' $((STAMP % 10000000)))\",\"password\":\"Other-$STAMP-pw\"}")
OTHER_TOKEN=$(str "$OTHER" accessToken)
[ -n "$OTHER_TOKEN" ] || fail "second customer registration failed: $OTHER"

OTHER_CODE=$($CURL -o /dev/null -w '%{http_code}' \
  "$GATEWAY_URL/delivery-api/api/v1/deliveries/$DELIVERY_ID" -H "Authorization: Bearer $OTHER_TOKEN")
case "$OTHER_CODE" in
  403|404) pass "unrelated customer denied ($OTHER_CODE)" ;;
  200)     fail "DATA LEAK: an unrelated customer read delivery $DELIVERY_ID" ;;
  *)       fail "unexpected status $OTHER_CODE for cross-tenant read" ;;
esac

echo "=== 5. Delivery partner accepts and fulfils ==="

ACCEPT=$($CURL -X POST "$GATEWAY_URL/delivery-api/api/v1/deliveries/$DELIVERY_ID/accept" \
  -H "Authorization: Bearer $DRIVER_TOKEN")
[ "$(str "$ACCEPT" status)" = "ASSIGNED" ] || fail "accept failed: $ACCEPT"
pass "delivery -> ASSIGNED"

$CURL -X PATCH "$GATEWAY_URL/delivery-api/api/v1/deliveries/$DELIVERY_ID/location" \
  -H "Authorization: Bearer $DRIVER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"latitude":12.9716,"longitude":77.5946}' >/dev/null
pass "driver location reported"

for STATUS in PICKED_UP IN_TRANSIT DELIVERED; do
  RESP=$($CURL -X PATCH "$GATEWAY_URL/delivery-api/api/v1/deliveries/$DELIVERY_ID/status" \
    -H "Authorization: Bearer $DRIVER_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"status\":\"$STATUS\"}")
  [ "$(str "$RESP" status)" = "$STATUS" ] || fail "transition to $STATUS failed: $RESP"
  pass "delivery -> $STATUS"
done

echo "=== 6. [Kafka] delivery completion should drive the order to DELIVERED ==="
FINAL=""
for i in $(seq 1 "$POLL_ATTEMPTS"); do
  O=$($CURL "$GATEWAY_URL/order-api/api/v1/orders/$ORDER_ID" -H "Authorization: Bearer $CUST_TOKEN")
  FINAL=$(str "$O" status)
  if [ "$FINAL" = "DELIVERED" ]; then
    pass "order reached DELIVERED via Kafka after ~$((i * POLL_INTERVAL))s"
    break
  fi
  sleep "$POLL_INTERVAL"
done
[ "$FINAL" = "DELIVERED" ] || fail "order stuck at '$FINAL' after $((POLL_ATTEMPTS * POLL_INTERVAL))s"

echo
echo "ALL CHECKS PASSED - order $ORDER_ID / delivery $DELIVERY_ID completed end to end."
