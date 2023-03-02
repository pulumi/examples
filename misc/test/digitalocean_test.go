//go:build DigitalOcean || all
// +build DigitalOcean all

package test

import (
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/v3/testing/integration"
	"github.com/stretchr/testify/assert"
)

func TestAccDigitalOceanPyK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-py-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ingress_ip"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanPyLoadbalancedDroplets(t *testing.T) {
	t.Skip("Skip due to 'Error waiting for Load Balancer' failures")
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-py-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanTsK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-ts-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["ingressIp"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanTsLoadbalancedDroplets(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-ts-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanCsK8s(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-cs-k8s"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["IngressIp"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}

func TestAccDigitalOceanCsLoadbalancedDroplets(t *testing.T) {
	test := getBaseOptions(t).
		With(integration.ProgramTestOptions{
			Dir: path.Join(getCwd(t), "..", "..", "digitalocean-cs-loadbalanced-droplets"),
			ExtraRuntimeValidation: func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
				assertHTTPResult(t, stack.Outputs["Endpoint"].(string), nil, func(body string) bool {
					return assert.Contains(t, body, "Welcome to nginx!")
				})
			},
		})

	integration.ProgramTest(t, &test)
}
