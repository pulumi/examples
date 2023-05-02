#!/bin/bash

call_api() {
    local method=$1
    local path=$2
    local body=$3
    local key="$(pulumi --cwd "infrastructure/api" --stack moolumi/dev config get apiKey)"
    local host="$(pulumi --cwd "infrastructure/api" --stack moolumi/dev stack output apiURL)"

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
