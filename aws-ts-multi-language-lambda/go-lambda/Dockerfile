FROM golang:1.22.5-alpine AS base

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