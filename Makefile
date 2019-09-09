.PHONY: ensure only_build only_test all

all: install only_build lint only_test

install:
	yarn global add tslint

ensure:
	cd misc/test && GO111MODULE=on go mod vendor

only_build:

lint:
	tslint -c tslint.json **/*.ts

only_test:
	go test ./misc/test/... --timeout 4h -v -count=1 -short -parallel 40

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: all
travis_pull_request: all
travis_api: all
