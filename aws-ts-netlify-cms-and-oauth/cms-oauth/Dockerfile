  
FROM golang:1.13-alpine3.12@sha256:e74b83b94d499cb34c7edf55fbdff9d3cfabd238a35f9cb1b59d0e74f50b1ddd as buildenv
RUN apk add --no-cache build-base git

WORKDIR /go/src/github.com/pulumi/aws-ts-netlify-cms-and-oauth/cms-oauth
COPY ./ ./
RUN go mod download

RUN go install ./
RUN ls /go/bin

FROM alpine:3.21@sha256:a8560b36e8b8210634f77d9f7f9efd7ffa463e380b75e2e74aff4511df3ef88c

RUN apk --no-cache add ca-certificates

COPY --from=buildenv /go/bin/aws-ts-netlify-cms-and-oauth /go/bin/aws-ts-netlify-cms-and-oauth

CMD ["/go/bin/netlify-cms-oauth-provider-go", "--logtostderr"]
