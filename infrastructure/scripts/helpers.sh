#!/bin/bash

call_api() {
    local method=$1
    local path=$2
    local body=$3
    local program="infrastructure/api"
    local stack="moolumi/dev"
    local key="$(pulumi --cwd $program --stack $stack stack output apiKey --show-secrets)"
    local host="$(pulumi --cwd $program --stack $stack stack output apiURL)"

    curl -s \
         -X ${method} \
         -H "x-api-key: ${key}" \
         -H "Content-type: application/json" \
         -d  "${body}" \
         "${host}${path}"
}

post_example() {
    call_api POST /examples "{ \"path\": \"$1\", \"ref\": \"$2\" }"
}

get_examples() {
    call_api GET /examples
}

get_example() {
    call_api GET /examples/$1
}

delete_example() {
    call_api DELETE /examples/$1
}
