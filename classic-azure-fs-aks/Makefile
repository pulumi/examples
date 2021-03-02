.PHONY: run-quiz
.SILENT: ;
.DEFAULT_GOAL := help

GIT_SHA:=$(shell git rev-parse --short HEAD)

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $$1, $$2}'

restore: ## Restore all
	dotnet restore

build: restore ## Build project
	dotnet build

deploy: build ## Deploy with -y
	pulumi up -y

exportconfig: ## Exports the kubernetes config
	pulumi stack output kubeconfig --show-secrets > kubeconfig.yaml

destroy: build ## Destroy with -y
	pulumi destroy -y

rmstack:
	pulumi stack rm -y
