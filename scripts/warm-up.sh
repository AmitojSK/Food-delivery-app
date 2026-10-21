#!/usr/bin/env bash
# Wake every Render free-tier service before a demo.
#
# Render spins free instances down after ~15 minutes of inactivity, and these
# Spring Boot services take ~90s to cold start on a 0.1 CPU instance. If a
# request arrives through api-gateway while a backend is still asleep, the
# gateway gives up waiting and returns 502 — which is what a "broken" demo
# looks like. Run this ~3 minutes before demoing and everything responds
# normally.
#
# Usage: ./scripts/warm-up.sh
#
# In GitHub Actions it also writes a glanceable ✅/❌ table to the run's summary
# (via $GITHUB_STEP_SUMMARY), so you can check it from a phone.

set -u

SERVICES=(
  "https://user-service-lk57.onrender.com/actuator/health"
  "https://restaurant-service-c30t.onrender.com/actuator/health"
  "https://food-catalogue-service.onrender.com/actuator/health"
  "https://order-service-aq1v.onrender.com/actuator/health"
  "https://delivery-service-gxjo.onrender.com/actuator/health"
  "https://realtime-service-gklo.onrender.com/actuator/health"
  "https://api-gateway-3nle.onrender.com/actuator/health"
  "https://food-delivery-ui-n8c3.onrender.com/"
  "https://partner-app-65z2.onrender.com/"
  "https://delivery-app-csdw.onrender.com/"
)

echo "Warming ${#SERVICES[@]} services (cold starts take up to ~2 min each)..."

# Fire them all off in parallel so the cold starts overlap instead of stacking.
# Each subshell appends "<status> <url>" to a temp file; we read it back after.
results="$(mktemp)"
for url in "${SERVICES[@]}"; do
  (
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 300 "$url")
    printf '%s %s\n' "$status" "$url" >> "$results"
  ) &
done
wait

# Start the GitHub Actions step summary (a markdown table, glanceable on mobile).
summary="${GITHUB_STEP_SUMMARY:-}"
if [ -n "$summary" ]; then
  { echo "## 🔥 Warm-up results"; echo ""; echo "| Service | Status |"; echo "|---|---|"; } >> "$summary"
fi

ok=0
total=0
# Sort so the order is stable regardless of which probe finished first.
while read -r status url; do
  total=$((total + 1))
  short=${url#https://}
  printf '  %-60s %s\n' "$short" "$status"
  case "$status" in
    2??) icon="✅"; ok=$((ok + 1)) ;;   # awake
    000) icon="⌛" ;;                    # no response within the timeout (still cold / unreachable)
    *)   icon="❌" ;;                    # a real error (4xx/5xx)
  esac
  if [ -n "$summary" ]; then
    printf '| `%s` | %s %s |\n' "$short" "$icon" "$status" >> "$summary"
  fi
done < <(sort "$results")
rm -f "$results"

echo "Done. ${ok}/${total} services returned 2xx (awake)."
if [ -n "$summary" ]; then
  { echo ""; echo "**${ok}/${total} services returned 2xx (awake).**"; } >> "$summary"
fi

# Non-zero exit if nothing woke, so a failed run is visible in the Actions list.
[ "$ok" -gt 0 ]
