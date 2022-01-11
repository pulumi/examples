
deps:
	go get
build:
	GOOS=linux GOARCH=amd64 go build -o ./handler/handler ./handler/handler.go
	zip -j ./handler/handler.zip ./handler/handler
clean:
	rm ./handler/handler
	rm ./handler/handler.zip