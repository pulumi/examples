.PHONY: ensure only_test all

all: install ensure lint only_test

install:
	yarn global add tslint typescript

ensure:
	cd misc/test && go mod tidy
	cd misc/test && go mod download

lint:
	tslint -c tslint.json **/*.ts

only_test:
	cd misc/test && go test ./... --timeout 4h -v -count=1 -short -parallel 40 --tags=all

specific_test_set:
	echo "running $(TestSet) Acceptance Tests"
	cd misc/test && go test . --timeout 4h -v -count=1 -short -parallel 40 --tags=all --run=TestAcc$(TestSet)

specific_tag_set:
	echo "running $(TagSet)$(TestSet) Acceptance Tests"
	cd misc/test && go test . --timeout 4h -v -count=1 -short -parallel 40 --tags=$(TagSet) --run=TestAcc$(TagSet)$(TestSet)

performance_test_set:
	cd misc/test && go test . --timeout 4h -count=1 -short -parallel 40 --tags=Performance

setup_test_infra:
	echo "Setting up test infra"
	./misc/scripts/create-ci-cluster.sh $(StackName)

destroy_test_infra:
	echo "Tearing down test infra"
	./misc/scripts/destroy-ci-cluster.sh $(StackName)

