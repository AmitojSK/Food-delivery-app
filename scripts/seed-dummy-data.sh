#!/usr/bin/env bash
# Seed a LARGER demo dataset into the deployed platform: several restaurant
# owners (one restaurant + menu each), several delivery partners, several
# customers, and a spread of orders left in every lifecycle state so all three
# apps have something to show. Writes a plaintext credentials file at the end.
#
# This complements scripts/seed-demo-data.sh (which seeds the single canonical
# "Spice Route" demo restaurant). This script leaves that one untouched and adds
# a fresh, namespaced set of accounts and restaurants alongside it.
#
# Privileged roles cannot self-register (public /auth/register always creates a
# CUSTOMER), so owners and drivers are created with an ADMIN token. The first
# ADMIN is bootstrapped separately - see DEPLOYMENT_HANDOFF.md.
#
# Everything is deterministic and idempotent: emails and passwords are fixed, so
# a re-run reuses existing accounts/restaurants rather than duplicating them.
# (Menus are only added when a restaurant is first created; orders are always
# placed fresh, since each run's orders advance independently.)
#
# ALWAYS run scripts/warm-up.* first - on Render's free tier a cold service can
# take ~90s to answer and a gateway call to a sleeping backend surfaces as a 502.
#
# Usage:
#   ADMIN_PASSWORD=... ./scripts/seed-dummy-data.sh
#
# Optional overrides:
#   GATEWAY_URL      default https://api-gateway-3nle.onrender.com
#   ADMIN_EMAIL      default admin@fooddelivery.local
#   DEMO_PASSWORD    shared password for every seeded account (default below)
#   CREDS_FILE       where to write the credentials file (default ./demo-credentials.txt)
#   SEED_ORDERS      1 to place demo orders (default), 0 to skip the order phase

set -uo pipefail

GATEWAY_URL="${GATEWAY_URL:-https://api-gateway-3nle.onrender.com}"
ADMIN_EMAIL="${ADMIN_EMAIL:-admin@fooddelivery.local}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:?ADMIN_PASSWORD must be set}"
DEMO_PASSWORD="${DEMO_PASSWORD:-FoodDemo2026!}"
CREDS_FILE="${CREDS_FILE:-demo-credentials.txt}"
SEED_ORDERS="${SEED_ORDERS:-1}"

CURL="curl -sS --max-time 120"
POLL_ATTEMPTS="${POLL_ATTEMPTS:-24}"
POLL_INTERVAL="${POLL_INTERVAL:-5}"

# --- JSON field extraction (same grep-based approach as the sibling scripts) ---
# `|| true` matters under pipefail: a grep that finds nothing must not abort the
# script from inside a command substitution before we can handle the miss.
json_field()  { grep -o "\"$2\":\"[^\"]*\"" <<<"$1" | head -1 | cut -d'"' -f4 || true; }
json_number() { grep -o "\"$2\":[0-9]*"     <<<"$1" | head -1 | cut -d: -f2   || true; }
# All numeric values of a repeated field across a JSON array, in document order.
json_numbers_all() { grep -o "\"$2\":[0-9]*" <<<"$1" | cut -d: -f2 || true; }

login() {
  local body
  body=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\":\"$1\",\"password\":\"$2\"}")
  json_field "$body" accessToken
}

# Create a privileged user as admin; ignores "already exists" so re-runs are safe.
create_user() {
  # $1 email  $2 role  $3 first  $4 last  $5 phone
  $CURL -X POST "$GATEWAY_URL/user-api/api/v1/users" \
    -H "Authorization: Bearer $ADMIN_TOKEN" -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"$3\",\"lastName\":\"$4\",\"email\":\"$1\",\"phoneNumber\":\"$5\",\"password\":\"$DEMO_PASSWORD\",\"role\":\"$2\"}" \
    >/dev/null 2>&1 || true
}

# Register a CUSTOMER via the public endpoint; returns "token|id". Falls back to
# login if the account already exists (deterministic password makes this work).
# Both the register and login responses nest a `user` object, so the flat
# `"id":<n>` grep recovers the user id in either case - which order placement
# needs (order-service takes userId in the body).
register_customer() {
  # $1 email  $2 first  $3 last  $4 phone
  local body token id
  body=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/register" \
    -H 'Content-Type: application/json' \
    -d "{\"firstName\":\"$2\",\"lastName\":\"$3\",\"email\":\"$1\",\"phoneNumber\":\"$4\",\"password\":\"$DEMO_PASSWORD\"}")
  token=$(json_field "$body" accessToken)
  if [ -z "$token" ]; then
    # Account already exists (or registration failed) - log in and read the id
    # from the login response body rather than discarding it.
    body=$($CURL -X POST "$GATEWAY_URL/user-api/api/v1/auth/login" \
      -H 'Content-Type: application/json' \
      -d "{\"email\":\"$1\",\"password\":\"$DEMO_PASSWORD\"}")
    token=$(json_field "$body" accessToken)
  fi
  id=$(json_number "$body" id)
  printf '%s|%s' "$token" "$id"
}

echo "==> Authenticating as admin ($ADMIN_EMAIL)"
ADMIN_TOKEN=$(login "$ADMIN_EMAIL" "$ADMIN_PASSWORD")
[ -n "$ADMIN_TOKEN" ] || { echo "admin login failed - check ADMIN_PASSWORD and that services are warm"; exit 1; }

# ---------------------------------------------------------------------------
# Data definitions. Slots are parallel arrays indexed 0..N-1.
# ---------------------------------------------------------------------------
# Restaurants (one owner each). Fields: name|cuisine|street|city|state|postal|ownerFirst|ownerLast|ownerEmail
REST=(
  "Tandoori Nights|North Indian|48 Connaught Place|New Delhi|Delhi|110001|Aarav|Kapoor|aarav.owner@fooddelivery.local"
  "Dosa Diaries|South Indian|22 Mount Road|Chennai|Tamil Nadu|600002|Lakshmi|Nair|lakshmi.owner@fooddelivery.local"
  "Pizza Fellas|Italian|7 Linking Road|Mumbai|Maharashtra|400050|Marco|Dsouza|marco.owner@fooddelivery.local"
  "Wok & Roll|Chinese|91 Banjara Hills|Hyderabad|Telangana|500034|Chen|Wei|chen.owner@fooddelivery.local"
  "Burger Bay|American|15 Church Street|Bengaluru|Karnataka|560001|Nadia|Khan|nadia.owner@fooddelivery.local"
)

# Menus per restaurant slot. Lines: name|description|category|price
menu_for() {
  case "$1" in
    0) cat <<'M'
Butter Chicken|Tandoor chicken in a silky tomato-butter gravy|Main Course|360.00
Chicken Biryani|Fragrant basmati layered with spiced chicken|Rice|340.00
Tandoori Roti|Whole-wheat flatbread from the clay oven|Breads|40.00
Paneer Tikka|Char-grilled cottage cheese with peppers|Starters|280.00
Mango Lassi|Sweet yoghurt smoothie with alphonso mango|Beverages|120.00
M
       ;;
    1) cat <<'M'
Masala Dosa|Crisp rice crepe with spiced potato filling|Main Course|180.00
Idli Sambar|Steamed rice cakes with lentil broth|Breakfast|140.00
Filter Coffee|South Indian coffee brewed and frothed|Beverages|80.00
Medu Vada|Savoury fried lentil doughnuts|Starters|120.00
Rava Kesari|Semolina dessert with saffron and ghee|Desserts|110.00
M
       ;;
    2) cat <<'M'
Margherita Pizza|San Marzano tomato, mozzarella, basil|Pizza|420.00
Pepperoni Pizza|Mozzarella and spicy pepperoni|Pizza|520.00
Penne Arrabbiata|Penne in a chilli-tomato sauce|Pasta|380.00
Garlic Bread|Toasted baguette with garlic butter|Starters|180.00
Tiramisu|Coffee-soaked layers with mascarpone|Desserts|260.00
M
       ;;
    3) cat <<'M'
Hakka Noodles|Wok-tossed noodles with vegetables|Main Course|240.00
Chilli Chicken|Crispy chicken in a spicy soy glaze|Starters|320.00
Veg Fried Rice|Rice tossed with garden vegetables|Rice|220.00
Dim Sum Platter|Assorted steamed dumplings|Starters|300.00
Honey Chilli Potato|Sweet-and-spicy crispy potato|Starters|210.00
M
       ;;
    4) cat <<'M'
Classic Cheeseburger|Beef patty, cheddar, lettuce, tomato|Burgers|300.00
Crispy Chicken Burger|Fried chicken fillet with slaw|Burgers|320.00
Loaded Fries|Fries with cheese sauce and jalapenos|Sides|180.00
Veggie Burger|Grilled bean patty with avocado|Burgers|280.00
Chocolate Milkshake|Thick shake with chocolate fudge|Beverages|190.00
M
       ;;
  esac
}

# Delivery partners: first|last|emailLocal
DRIVERS=(
  "Ravi|Kumar|ravi.driver"
  "Sunita|Reddy|sunita.driver"
  "Imran|Sheikh|imran.driver"
  "Priya|Menon|priya.driver"
  "Vikram|Bose|vikram.driver"
)

# Customers: first|last|emailLocal
CUSTOMERS=(
  "Ananya|Gupta|ananya.cust"
  "Rohan|Verma|rohan.cust"
  "Meera|Joshi|meera.cust"
  "Karan|Malhotra|karan.cust"
  "Diya|Pillai|diya.cust"
  "Arjun|Rao|arjun.cust"
  "Sara|Fernandes|sara.cust"
  "Neel|Chatterjee|neel.cust"
)

# Phone helpers - each user needs a globally unique phone (NOT NULL UNIQUE).
owner_phone()  { printf '+91980000010%d' "$1"; }
driver_phone() { printf '+91980000020%d' "$1"; }
cust_phone()   { printf '+91980000030%d' "$1"; }

# ---------------------------------------------------------------------------
# Owners + restaurants + menus
# ---------------------------------------------------------------------------
declare -a OWNER_EMAIL OWNER_TOKEN REST_ID REST_NAME
declare -a REST_ITEM_IDS   # "id id id ..." of that restaurant's menu items
declare -a REST_ITEM_NAMES # "name|name|name|..." aligned with REST_ITEM_IDS
declare -a REST_ITEM_PRICES

echo "==> Creating owners, restaurants and menus"
for i in "${!REST[@]}"; do
  IFS='|' read -r name cuisine street city state postal ofirst olast oemail <<<"${REST[$i]}"
  create_user "$oemail" RESTAURANT_OWNER "$ofirst" "$olast" "$(owner_phone $((i+1)))"
  otoken=$(login "$oemail" "$DEMO_PASSWORD")
  OWNER_EMAIL[$i]="$oemail"
  OWNER_TOKEN[$i]="$otoken"
  if [ -z "$otoken" ]; then
    echo "    ! owner $oemail login failed, skipping restaurant"
    REST_ID[$i]=""; continue
  fi

  # Reuse this owner's restaurant if the seed has already run.
  existing=$($CURL "$GATEWAY_URL/restaurant-api/api/v1/partner/restaurants" \
    -H "Authorization: Bearer $otoken")
  rid=$(json_number "$existing" id)

  fresh=0
  if [ -z "$rid" ]; then
    created=$($CURL -X POST "$GATEWAY_URL/restaurant-api/api/v1/partner/restaurants" \
      -H "Authorization: Bearer $otoken" -H 'Content-Type: application/json' \
      -d "{\"name\":\"$name\",\"cuisineType\":\"$cuisine\",\"streetAddress\":\"$street\",\"city\":\"$city\",\"state\":\"$state\",\"postalCode\":\"$postal\",\"contactEmail\":\"contact.$((i+1))@fooddelivery.local\",\"contactPhone\":\"$(owner_phone $((i+1)))\"}")
    rid=$(json_number "$created" id)
    fresh=1
    if [ -z "$rid" ]; then
      echo "    ! restaurant '$name' creation failed: $created"
      REST_ID[$i]=""; continue
    fi
    echo "    + $name (id $rid) [new]"
  else
    echo "    = $name (id $rid) [reused]"
  fi
  REST_ID[$i]="$rid"; REST_NAME[$i]="$name"

  # Menu items - idempotent top-up. Add any defined item whose name is not
  # already present for this restaurant (so a partially-seeded restaurant from
  # an interrupted run self-heals on re-run), then read back all ids in order.
  names=""; prices=""; added=0
  listing=$($CURL "$GATEWAY_URL/catalogue-api/api/v1/food-items?restaurantId=$rid" \
    -H "Authorization: Bearer $otoken")
  while IFS='|' read -r iname idesc icat iprice; do
    [ -n "$iname" ] || continue
    names="$names|$iname"; prices="$prices|$iprice"
    if ! grep -qF "\"name\":\"$iname\"" <<<"$listing"; then
      resp=$($CURL -X POST "$GATEWAY_URL/catalogue-api/api/v1/partner/food-items" \
        -H "Authorization: Bearer $otoken" -H 'Content-Type: application/json' \
        -d "{\"restaurantId\":$rid,\"name\":\"$iname\",\"description\":\"$idesc\",\"category\":\"$icat\",\"price\":$iprice}")
      if [ -n "$(json_number "$resp" id)" ]; then
        added=$((added+1))
      else
        echo "      ! item '$iname' failed: $resp"
      fi
    fi
  done < <(menu_for "$i")
  # Re-read so ids include both pre-existing and just-added items, in order.
  listing=$($CURL "$GATEWAY_URL/catalogue-api/api/v1/food-items?restaurantId=$rid" \
    -H "Authorization: Bearer $otoken")
  ids=$(json_numbers_all "$listing" id | tr '\n' ' ')
  echo "      menu: $(wc -w <<<"$ids") items ($added added this run)"
  REST_ITEM_IDS[$i]="${ids# }"
  REST_ITEM_NAMES[$i]="${names#|}"
  REST_ITEM_PRICES[$i]="${prices#|}"
done

# ---------------------------------------------------------------------------
# Delivery partners
# ---------------------------------------------------------------------------
echo "==> Creating delivery partners"
declare -a DRIVER_EMAIL DRIVER_TOKEN
for i in "${!DRIVERS[@]}"; do
  IFS='|' read -r dfirst dlast dlocal <<<"${DRIVERS[$i]}"
  demail="$dlocal@fooddelivery.local"
  create_user "$demail" DELIVERY_PARTNER "$dfirst" "$dlast" "$(driver_phone $((i+1)))"
  DRIVER_EMAIL[$i]="$demail"
  DRIVER_TOKEN[$i]="$(login "$demail" "$DEMO_PASSWORD")"
  echo "    + $dfirst $dlast ($demail)"
done

# ---------------------------------------------------------------------------
# Customers
# ---------------------------------------------------------------------------
echo "==> Creating customers"
declare -a CUST_EMAIL CUST_TOKEN CUST_ID CUST_NAME
for i in "${!CUSTOMERS[@]}"; do
  IFS='|' read -r cfirst clast clocal <<<"${CUSTOMERS[$i]}"
  cemail="$clocal@fooddelivery.local"
  res=$(register_customer "$cemail" "$cfirst" "$clast" "$(cust_phone $((i+1)))")
  CUST_EMAIL[$i]="$cemail"
  CUST_TOKEN[$i]="${res%%|*}"
  CUST_ID[$i]="${res##*|}"
  CUST_NAME[$i]="$cfirst $clast"
  echo "    + $cfirst $clast ($cemail)"
done

# ---------------------------------------------------------------------------
# Orders - a spread across every lifecycle state.
# ---------------------------------------------------------------------------
# Advance an order through owner-driven states up to a target. Returns nothing;
# prints progress. $1 orderId  $2 restaurantId  $3 ownerToken  $4 target
advance_owner() {
  local oid="$1" rid="$2" otok="$3" target="$4" s resp got
  local chain="CONFIRMED PREPARING READY_FOR_PICKUP"
  for s in $chain; do
    resp=$($CURL -X PATCH "$GATEWAY_URL/order-api/api/v1/partner/orders/$oid/status?restaurantId=$rid" \
      -H "Authorization: Bearer $otok" -H 'Content-Type: application/json' \
      -d "{\"status\":\"$s\"}")
    got=$(json_field "$resp" status)
    [ "$got" = "$s" ] || { echo "        ! transition to $s failed: $resp"; return 1; }
    [ "$s" = "$target" ] && return 0
  done
  return 0
}

place_order() {
  # $1 custSlot  $2 restSlot -> echoes orderId (empty on failure)
  local cs="$1" rs="$2"
  local ctok="${CUST_TOKEN[$cs]}" cid="${CUST_ID[$cs]}" rid="${REST_ID[$rs]}"
  [ -n "$ctok" ] && [ -n "$rid" ] || { echo ""; return; }
  # order-service reads userId from the body; if we didn't capture the id at
  # registration (existing account), skip - the token still scopes the order.
  [ -n "$cid" ] || { echo ""; return; }

  # Take the first two menu items of the restaurant.
  local ids=(${REST_ITEM_IDS[$rs]})
  IFS='|' read -ra nms <<<"${REST_ITEM_NAMES[$rs]}"
  IFS='|' read -ra prs <<<"${REST_ITEM_PRICES[$rs]}"
  [ "${#ids[@]}" -ge 2 ] || { echo ""; return; }

  local items="[{\"foodItemId\":${ids[0]},\"foodItemName\":\"${nms[0]}\",\"quantity\":2,\"unitPrice\":${prs[0]}},{\"foodItemId\":${ids[1]},\"foodItemName\":\"${nms[1]}\",\"quantity\":1,\"unitPrice\":${prs[1]}}]"
  local resp
  resp=$($CURL -X POST "$GATEWAY_URL/order-api/api/v1/orders" \
    -H "Authorization: Bearer $ctok" -H 'Content-Type: application/json' \
    -d "{\"userId\":$cid,\"restaurantId\":$rid,\"deliveryAddress\":\"${CUST_NAME[$cs]}, 12 Residency Road, Bengaluru 560025\",\"contactName\":\"${CUST_NAME[$cs]}\",\"contactPhone\":\"$(cust_phone $((cs+1)))\",\"items\":$items}")
  json_field "$resp" id
}

# Drive an order all the way to DELIVERED via Kafka + a driver.
deliver_order() {
  # $1 orderId  $2 driverToken
  local oid="$1" dtok="$2" d did i status resp
  # Poll for the PENDING delivery the OrderReadyForPickup event creates.
  did=""
  for i in $(seq 1 "$POLL_ATTEMPTS"); do
    d=$($CURL "$GATEWAY_URL/delivery-api/api/v1/deliveries/order/$oid" -H "Authorization: Bearer $dtok")
    did=$(json_number "$d" id)
    [ -n "$did" ] && break
    sleep "$POLL_INTERVAL"
  done
  [ -n "$did" ] || { echo "        ! no delivery appeared for order $oid"; return 1; }
  $CURL -X POST "$GATEWAY_URL/delivery-api/api/v1/deliveries/$did/accept" \
    -H "Authorization: Bearer $dtok" >/dev/null
  $CURL -X PATCH "$GATEWAY_URL/delivery-api/api/v1/deliveries/$did/location" \
    -H "Authorization: Bearer $dtok" -H 'Content-Type: application/json' \
    -d '{"latitude":12.9716,"longitude":77.5946}' >/dev/null
  for status in PICKED_UP IN_TRANSIT DELIVERED; do
    resp=$($CURL -X PATCH "$GATEWAY_URL/delivery-api/api/v1/deliveries/$did/status" \
      -H "Authorization: Bearer $dtok" -H 'Content-Type: application/json' \
      -d "{\"status\":\"$status\"}")
    [ "$(json_field "$resp" status)" = "$status" ] || { echo "        ! delivery $did -> $status failed: $resp"; return 1; }
  done
  echo "        delivery $did driven to DELIVERED"
  return 0
}

# order plan: custSlot restSlot targetState
# targets: CREATED (leave), CONFIRMED, PREPARING, READY_FOR_PICKUP, DELIVERED
ORDER_PLAN=(
  "0 0 CREATED"
  "1 0 CONFIRMED"
  "2 1 PREPARING"
  "3 1 READY_FOR_PICKUP"
  "4 2 CREATED"
  "5 2 CONFIRMED"
  "6 3 READY_FOR_PICKUP"
  "7 3 PREPARING"
  "0 4 DELIVERED"
  "1 2 DELIVERED"
)

declare -a ORDER_SUMMARY
if [ "$SEED_ORDERS" = "1" ]; then
  echo "==> Placing demo orders (this exercises Kafka for the delivered ones; be patient on a cold stack)"
  for spec in "${ORDER_PLAN[@]}"; do
    read -r cs rs target <<<"$spec"
    oid=$(place_order "$cs" "$rs")
    if [ -z "$oid" ]; then
      echo "    ! order (cust $cs, rest $rs) not placed (missing token/menu) - skipped"
      continue
    fi
    label="${CUST_NAME[$cs]} @ ${REST_NAME[$rs]:-rest$rs}"
    echo "    + order $oid: $label -> target $target"
    case "$target" in
      CREATED) : ;;
      CONFIRMED|PREPARING|READY_FOR_PICKUP)
        advance_owner "$oid" "${REST_ID[$rs]}" "${OWNER_TOKEN[$rs]}" "$target" ;;
      DELIVERED)
        advance_owner "$oid" "${REST_ID[$rs]}" "${OWNER_TOKEN[$rs]}" READY_FOR_PICKUP \
          && deliver_order "$oid" "${DRIVER_TOKEN[0]}" ;;
    esac
    ORDER_SUMMARY+=("order $oid  $label  ->  $target")
  done
else
  echo "==> SEED_ORDERS=0, skipping order phase"
fi

# ---------------------------------------------------------------------------
# Credentials file
# ---------------------------------------------------------------------------
echo "==> Writing credentials to $CREDS_FILE"
{
  echo "Food Delivery - demo dummy data credentials"
  echo "Generated: $(date -u '+%Y-%m-%d %H:%M:%SZ')  against $GATEWAY_URL"
  echo
  echo "All accounts below share the same password: $DEMO_PASSWORD"
  echo "(The original admin/owner/driver accounts have their own passwords,"
  echo " recorded in DEPLOYMENT_HANDOFF.md, and are not repeated here.)"
  echo
  echo "RESTAURANT OWNERS (each owns one restaurant)"
  echo "-------------------------------------------------------------------"
  for i in "${!REST[@]}"; do
    [ -n "${REST_ID[$i]:-}" ] || continue
    printf '  %-38s  restaurant #%s  %s\n' "${OWNER_EMAIL[$i]}" "${REST_ID[$i]}" "${REST_NAME[$i]}"
  done
  echo
  echo "DELIVERY PARTNERS"
  echo "-------------------------------------------------------------------"
  for i in "${!DRIVER_EMAIL[@]}"; do
    printf '  %s\n' "${DRIVER_EMAIL[$i]}"
  done
  echo
  echo "CUSTOMERS"
  echo "-------------------------------------------------------------------"
  for i in "${!CUST_EMAIL[@]}"; do
    printf '  %s\n' "${CUST_EMAIL[$i]}"
  done
  if [ "${#ORDER_SUMMARY[@]}" -gt 0 ]; then
    echo
    echo "SEEDED ORDERS"
    echo "-------------------------------------------------------------------"
    for line in "${ORDER_SUMMARY[@]}"; do printf '  %s\n' "$line"; done
  fi
} | tee "$CREDS_FILE"

echo
echo "==> Done. Credentials written to $CREDS_FILE"
