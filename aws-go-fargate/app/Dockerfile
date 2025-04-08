# Start from a Debian image with the latest version of Go installed
# and a workspace (GOPATH) configured at /go.
FROM golang@sha256:b6652731d1d5622f85509f72942ce2a344e3bf6dd6793b2e462cc5fb3126b566

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