# Start from a Debian image with the latest version of Go installed
# and a workspace (GOPATH) configured at /go.
FROM golang@sha256:c5adecdb7b3f8c5ca3c88648a861882849cc8b02fed68ece31e25de88ad13418

# Copy the local package files to the container's workspace.
ADD . /go/src/foo

# Build the outyet command inside the container.
# (You may fetch or manage dependencies here,
# either manually or with a tool like "godep".)
WORKDIR /go/src/foo
RUN go build -o /go/bin/main

# Run the outyet command by default when the container starts.
ENTRYPOINT /go/bin/main

# Document that the service listens on port 80.
EXPOSE 80