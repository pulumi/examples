FROM golang:1.24.1-alpine@sha256:43c094ad24b6ac0546c62193baeb3e6e49ce14d3250845d166c77c25f64b0386 AS base

WORKDIR /app
RUN apk --no-cache add zip

FROM base AS modules

COPY go.* .
COPY main.go .
RUN go mod tidy

FROM base AS builder

COPY --from=modules /app/ /app/
COPY --from=modules /go/pkg/mod/ /go/pkg/mod

RUN GOOS=linux GOARCH=amd64 go build -tags lambda.norpc -o bootstrap main.go 

FROM scratch

COPY --from=builder /app/bootstrap .