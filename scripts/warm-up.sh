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

set -u

SERVICES=(
  "https://user-service-lk57.onrender.com/actuator/health"
  "https://restaurant-service-c30t.onrender.com/actuator/health"
  "https://food-catalogue-service.onrender.com/actuator/health"
  "https://order-service-aq1v.onrender.com/actuator/health"
  "https://delivery-service-gxjo.onrender.com/actuator/health"
  "https://api-gateway-3nle.onrender.com/actuator/health"
  "https://food-delivery-ui-n8c3.onrender.com/"
  "https://partner-app-65z2.onrender.com/"
  "https://delivery-app-csdw.onrender.com/"
)

echo "Warming ${#SERVICES[@]} services (cold starts take up to ~2 min each)..."

# Fire them all off in parallel so the cold starts overlap instead of stacking.
for url in "${SERVICES[@]}"; do
  (
    status=$(curl -s -o /dev/null -w '%{http_code}' --max-time 300 "$url")
    printf '  %-60s %s\n' "${url#https://}" "$status"
  ) &
done
wait

echo "Done. All services should now be warm for ~15 minutes of inactivity."
