TestParallelism ?= 40

.PHONY: ensure only_build only_test all
all: install ensure only_build lint only_test

install:
	yarn global add tslint typescript

ensure:
	cd misc/test && GO111MODULE=on go mod tidy
	cd misc/test && GO111MODULE=on go mod download

only_build:

lint:
	tslint -c tslint.json **/*.ts

only_test:
	cd misc/test && go test ./... --timeout 4h -v -count=1 -short -parallel 40

specific_test_set:
	echo "running $(TestSet) Acceptance Tests with parallelism $(TestParallelism)"
	cd misc/test && go test . --timeout 4h -v -count=1 -short -parallel $(TestParallelism) --run=TestAcc$(TestSet)

setup_test_infra:
	echo "Setting up test infra"
	./misc/scripts/create-ci-cluster.sh $(StackName)

destroy_test_infra:
	echo "Tearing down test infra"
	./misc/scripts/destroy-ci-cluster.sh $(StackName)

# The travis_* targets are entrypoints for CI.
.PHONY: travis_cron travis_push travis_pull_request travis_api
travis_cron: all
travis_push: all
travis_pull_request: all
travis_api: all
