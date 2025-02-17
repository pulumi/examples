  
FROM golang:1.16-alpine3.12@sha256:db2475a1dbb2149508e5db31d7d77a75e6600d54be645f37681f03f2762169ba as buildenv
RUN apk add --no-cache build-base git

WORKDIR /go/src/github.com/pulumi/aws-ts-netlify-cms-and-oauth/cms-oauth
COPY ./ ./
RUN go mod download

RUN go install ./
RUN ls /go/bin

FROM alpine:3.12@sha256:c75ac27b49326926b803b9ed43bf088bc220d22556de1bc5f72d742c91398f69

RUN apk --no-cache add ca-certificates

COPY --from=buildenv /go/bin/aws-ts-netlify-cms-and-oauth /go/bin/aws-ts-netlify-cms-and-oauth

CMD ["/go/bin/netlify-cms-oauth-provider-go", "--logtostderr"]
