#!/usr/bin/env bash
# Seed the deployed environment with demo data: a restaurant owner, a delivery
# partner, one restaurant, and a small menu.
#
# The platform deliberately does not allow public registration of privileged
# roles (public /auth/register always creates a CUSTOMER), so creating an owner
# or driver requires an ADMIN token. The first ADMIN has to be inserted directly
# into user_service_db as a one-time bootstrap - see DEPLOYMENT_HANDOFF.md.
#
# Usage:
#   ADMIN_PASSWORD=... ./scripts/seed-demo-data.sh
#
# Optional overrides:
#   GATEWAY_URL, ADMIN_EMAIL, OWNER_PASSWORD, DRIVER_PASSWORD

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-https://api-gateway-3nle.onrender.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@fooddelivery.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set}"

OWNER_EMAIL="${OWNER_EMAIL:-owner@fooddelivery.local}"
OWNER_PASSWORD="${OWNER_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)}"
DRIVER_EMAIL="${DRIVER_EMAIL:-driver@fooddelivery.local}"
DRIVER_PASSWORD="${DRIVER_PASSWORD:-$(openssl rand -base64 18 | tr -d '/+=' | head -c 20)}"

CURL="curl -sS --max-time 120"

json_field() { grep -o "\"$2\":\"[^\"]*\"" <<<"$1" | head -1 | cut -d'"' -f4; }
json_number() { grep -o "\"$2\":[0-9]*" <<<"$1" | head -1 | cut -d: -f2; }

login() {
  local body
  body=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}")
  json_field "$body" accessToken
}

create_user() {
  # $1 email  $2 password  $3 role  $4 first  $5 last  $6 phone
  $CURL -X POST "$GATEWAY_URL/user-api/api/v1/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"$4\",\"lastName\":\"$5\",\"email\":\"$1\",\"phoneNumber\":\"$6\",\"password\":\"$2\",\"role\":\"$3\"}"
}

echo "==> Authenticating as admin"
ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
[ -n "$ADMIN_TOKEN" ] || { echo "admin login failed"; exit 1; }

echo "==> Creating restaurant owner and delivery partner"
create_user "$OWNER_EMAIL"  "$OWNER_PASSWORD"  RESTAURANT_OWNER  Maya  Iyer   "+910000000002" >/dev/null || true
create_user "$DRIVER_EMAIL" "$DRIVER_PASSWORD" DELIVERY_PARTNER  Ravi  Sharma "+910000000003" >/dev/null || true

echo "==> Authenticating as restaurant owner"
OWNER_TOKEN=$(login "$OWNER_EMAIL" "$OWNER_PASSWORD")
[ -n "$OWNER_TOKEN" ] || { echo "owner login failed"; exit 1; }

echo "==> Creating restaurant"
RESTAURANT=$($CURL -X POST "$GATEWAY_URL/restaurant-api/api/v1/partner/restaurants" \
  -H "Authorization: Bearer $OWNER_TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Spice Route","cuisineType":"North Indian","streetAddress":"12 MG Road","city":"Bengaluru","state":"Karnataka","postalCode":"560001","contactEmail":"hello@spiceroute.local","contactPhone":"+910000000010"}')
RESTAURANT_ID=$(json_number "$RESTAURANT" id)
[ -n "$RESTAURANT_ID" ] || { echo "restaurant creation failed: $RESTAURANT"; exit 1; }
echo "    restaurant id = $RESTAURANT_ID"

echo "==> Adding menu items"
add_item() {
  $CURL -X POST "$GATEWAY_URL/catalogue-api/api/v1/partner/food-items" \
    -H "Authorization: Bearer $OWNER_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"restaurantId\":$RESTAURANT_ID,\"name\":\"$1\",\"description\":\"$2\",\"category\":\"$3\",\"price\":$4}" >/dev/null
  echo "    + $1"
}
add_item "Paneer Butter Masala" "Cottage cheese in a rich tomato and cashew gravy" "Main Course" 320.00
add_item "Dal Tadka"            "Yellow lentils tempered with cumin and garlic"      "Main Course" 240.00
add_item "Garlic Naan"          "Tandoor-baked flatbread with garlic and coriander"  "Breads"      70.00
add_item "Gulab Jamun"          "Milk dumplings soaked in cardamom syrup"            "Desserts"    140.00

cat <<SUMMARY

==> Seed complete. Demo credentials (save these):

  Restaurant owner : $OWNER_EMAIL / $OWNER_PASSWORD
  Delivery partner : $DRIVER_EMAIL / $DRIVER_PASSWORD

  Restaurant id    : $RESTAURANT_ID
SUMMARY
