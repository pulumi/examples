FROM golang:1.22.5-alpine@sha256:0d3653dd6f35159ec6e3d10263a42372f6f194c3dea0b35235d72aabde86486e AS base

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