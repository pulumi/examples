#!/usr/bin/env bash
# Checks that the beta Container App answers at SERVICE_URL. A new Container
# App can take a minute to start, so retry before failing.
set -euo pipefail

if [ -z "${SERVICE_URL:-}" ]; then
  echo "SERVICE_URL is not set; the beta stack has no url output" >&2
  exit 1
fi
if [ -z "${DELIVERY_OUTPUTS:-}" ]; then
  echo "DELIVERY_OUTPUTS is not set; run this script as a Delivery job" >&2
  exit 1
fi

attempts=12
for attempt in $(seq 1 "$attempts"); do
  if curl -fsS --max-time 10 "$SERVICE_URL"; then
    printf '{"checked": "%s"}\n' "$SERVICE_URL" > "$DELIVERY_OUTPUTS"
    exit 0
  fi
  echo "Attempt $attempt/$attempts: $SERVICE_URL did not answer" >&2
  if [ "$attempt" -lt "$attempts" ]; then
    sleep 10
  fi
done

echo "$SERVICE_URL did not answer after $attempts attempts" >&2
exit 1
