all: build_authorizer build_handler

build_authorizer:
	GOOS=linux GOARCH=amd64 go build -o ./bin/authorizer ./authorizer/handler.go
	zip -j ./bin/authorizer.zip ./bin/authorizer

build_handler:
	GOOS=linux GOARCH=amd64 go build -o ./bin/handler ./handler/handler.go
	zip -j ./bin/handler.zip ./bin/handler
