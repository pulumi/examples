#!/usr/bin/env bash
# Checks that the beta service answers 200 over HTTP. A new load balancer
# can take a few minutes to start serving, so retry until then.
#
# Delivery runs this as a Job. SERVICE_URL comes from the beta stack's `url`
# output; the result is written as JSON to $DELIVERY_OUTPUTS.
set -euo pipefail

if [ -z "${SERVICE_URL:-}" ]; then
    echo "SERVICE_URL is not set" >&2
    exit 1
fi
: "${DELIVERY_OUTPUTS:?DELIVERY_OUTPUTS is not set}"
attempts="${CHECK_ATTEMPTS:-30}"
delay="${CHECK_DELAY:-10}"

for ((attempt = 1; attempt <= attempts; attempt++)); do
    if body=$(curl -fsS --max-time 10 "$SERVICE_URL"); then
        echo "$SERVICE_URL answered 200 on attempt $attempt: $body"
        printf '{"url": "%s", "status": "200"}\n' "$SERVICE_URL" > "$DELIVERY_OUTPUTS"
        exit 0
    fi
    if [ "$attempt" -lt "$attempts" ]; then
        echo "attempt $attempt/$attempts failed, retrying in ${delay}s"
        sleep "$delay"
    fi
done

echo "no 200 from $SERVICE_URL after $attempts attempts" >&2
exit 1
