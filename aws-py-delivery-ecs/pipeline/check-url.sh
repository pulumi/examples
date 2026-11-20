#!/usr/bin/env bash
# Checks that the beta service answers over HTTP. A new task takes a minute
# or two to pass the load balancer's health checks, so retry until then.
set -euo pipefail

: "${SERVICE_URL:?SERVICE_URL is not set}"
: "${DELIVERY_OUTPUTS:?DELIVERY_OUTPUTS is not set}"
timeout="${CHECK_TIMEOUT:-300}"
deadline=$((SECONDS + timeout))

status=000
while :; do
    status=$(curl -sS -o /tmp/check-url.body -w '%{http_code}' --max-time 10 "$SERVICE_URL" || true)
    if [ "$status" = 200 ]; then
        break
    fi
    if [ "$SECONDS" -ge "$deadline" ]; then
        echo "$SERVICE_URL did not answer 200 within ${timeout}s (last status: $status)" >&2
        exit 1
    fi
    echo "$SERVICE_URL answered $status, retrying in 10s"
    sleep 10
done

echo "$SERVICE_URL answered 200:"
cat /tmp/check-url.body
printf '{"status": "%s", "url": "%s"}\n' "$status" "$SERVICE_URL" > "$DELIVERY_OUTPUTS"
