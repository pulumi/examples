  
FROM golang:1.13-alpine3.12 as buildenv
RUN apk add --no-cache build-base git

WORKDIR /go/src/github.com/pulumi/aws-ts-netlify-cms-and-oauth/cms-oauth
COPY ./ ./
RUN go mod download

RUN go install ./
RUN ls /go/bin

FROM alpine:3.12

RUN apk --no-cache add ca-certificates

COPY --from=buildenv /go/bin/aws-ts-netlify-cms-and-oauth /go/bin/aws-ts-netlify-cms-and-oauth

CMD ["/go/bin/netlify-cms-oauth-provider-go", "--logtostderr"]
