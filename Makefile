all: ensure only_test

ensure: setup_python
	cd misc/test && go mod tidy
	cd misc/test && go mod download
	npm --prefix testing-unit-ts/mocha install
	npm install --global tslint

only_test:
	bash -c 'set -o pipefail && cd misc/test && go test -json ./... --timeout 4h -v -count=1 -short -parallel 40 --tags=all | gotestfmt'

specific_test_set:
	echo "Running $(TestSet) acceptance tests"
	bash -c 'set -o pipefail && cd misc/test && go test -json . --timeout 4h -v -count=1 -short -parallel 40 --tags=all --run=TestAcc$(TestSet) | gotestfmt'

specific_tag_set:
	echo "Running $(TagSet)$(TestSet) acceptance tests"
	bash -c 'set -o pipefail && cd misc/test && go test -json . --timeout 4h -v -count=1 -short -parallel 40 --tags=$(TagSet) --run=TestAcc$(TagSet)$(TestSet) | gotestfmt'

# Run a test of a single example. Example usage:
#
#     make test_example.TestAccAwsPyS3Folder
test_example.%:
	cd misc/test && go test -test.v -run "^$*$$" -tags all

# Some of the examples double up as performance benchmarks. Run:
#
#     make bench_example.TestAccAwsPyS3Folder
#
# This will run the example and populate ./traces with performance data.
# See also https://www.pulumi.com/docs/support/troubleshooting/#performance
bench_example.%:
	mkdir -p ./traces
	cd misc/test && PULUMI_TRACING_DIR=${PWD}/traces go test -test.v -run "^$*$$" -tags all

.PHONY: format setup_python clean

# Create a virtual environment and install black
setup_python:
	@if [ ! -d "venv" ]; then \
		python3 -m venv venv; \
		venv/bin/pip install --upgrade pip; \
		venv/bin/pip install black; \
		echo "Virtual environment created and black installed."; \
	else \
		echo "Virtual environment already exists."; \
	fi

# Validate that all Python files are properly formatted with Black
check_python_formatting: setup_python
	@if find . -name "*.py" -not -path "./venv/*" | xargs venv/bin/black --config black.toml --check; then \
		echo "All Python files are properly formatted."; \
	else \
		echo "Some files are not formatted. Run 'make format' to fix."; \
		exit 1; \
	fi
# Run Black against all Python files in the project, excluding venv
format: setup_python
	find . -name "*.py" -not -path "*/venv/*" | xargs venv/bin/black --config black.toml

# Clean up the virtual environment
clean:
	rm -rf venv
