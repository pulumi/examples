package definitions_test

import (
	"testing"

	"github.com/pulumi/examples/misc/test/definitions"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetExamplesByTags(t *testing.T) {
	azureTests := definitions.GetTestsForTag("azure")
	require.NotEmpty(t, azureTests)

	typescriptTests := definitions.GetTestsForTag(definitions.TS)
	require.NotEmpty(t, typescriptTests)

	azureTypescriptTests := definitions.GetTestsForTag("azure").GetTestsForTag(definitions.TS)
	require.NotEmpty(t, azureTypescriptTests)

	azureTestNames := map[string]struct{}{}
	for _, test := range azureTests {
		azureTestNames[test.Dir] = struct{}{}
	}
	typescriptTestNames := map[string]struct{}{}
	for _, test := range typescriptTests {
		typescriptTestNames[test.Dir] = struct{}{}
	}
	azureTypescriptTestNames := map[string]struct{}{}
	for _, test := range azureTypescriptTests {
		azureTypescriptTestNames[test.Dir] = struct{}{}
	}

	for test := range azureTypescriptTestNames {
		assert.Contains(t, azureTestNames, test)
		assert.Contains(t, typescriptTestNames, test)
	}

	azureTsIntersection := map[string]struct{}{}
	for test := range azureTestNames {
		if _, ok := typescriptTestNames[test]; ok {
			azureTsIntersection[test] = struct{}{}
		}
	}
	assert.Equal(t, azureTypescriptTestNames, azureTsIntersection)
}
