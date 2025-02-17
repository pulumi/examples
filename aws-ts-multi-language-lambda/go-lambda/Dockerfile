FROM golang:1.24.0-alpine@sha256:2d40d4fc278dad38be0777d5e2a88a2c6dee51b0b29c97a764fc6c6a11ca893c AS base

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