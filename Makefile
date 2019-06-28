.PHONY: ensure only_build only_test all

all: only_build only_test

ensure:
	cd misc/test && dep ensure -v

only_build:

only_test:
	go test ./misc/test/... --timeout 4h -v -count=1 -short -parallel 40

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: all
travis_pull_request: all
travis_api: all
