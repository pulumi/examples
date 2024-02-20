package definitions_test

import (
	"testing"

	"github.com/pulumi/examples/misc/test/definitions"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetExamplesByTags(t *testing.T) {
	azureNativeTests := definitions.GetTestsByTags(definitions.AzureNativeProvider)
	require.NotEmpty(t, azureNativeTests)

	typescriptTests := definitions.GetTestsByTags(definitions.TS)
	require.NotEmpty(t, typescriptTests)

	// Ensure that the intersection of the two tags is correct.
	azureNativeTypescriptTests := definitions.GetTestsByTags(definitions.AzureNativeProvider, definitions.TS)
	require.NotEmpty(t, azureNativeTypescriptTests)

	azureTestNames := map[string]struct{}{}
	for _, test := range azureNativeTests {
		azureTestNames[test.Dir] = struct{}{}
	}
	typescriptTestNames := map[string]struct{}{}
	for _, test := range typescriptTests {
		typescriptTestNames[test.Dir] = struct{}{}
	}
	azureTypescriptTestNames := map[string]struct{}{}
	for _, test := range azureNativeTypescriptTests {
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

func TestGetExamplesByTagsDoesNotReturnDuplicates(t *testing.T) {
	azureTests := definitions.GetTestsByTags(definitions.AzureCloud, definitions.AzureClassicProvider, definitions.TS)
	require.NotEmpty(t, azureTests)

	set := map[string]struct{}{}
	for _, test := range azureTests {
		set[test.Dir] = struct{}{}
	}
	assert.Equal(t, len(azureTests), len(set))
}

func TestGetExamplesByTagsForNoTags(t *testing.T) {
	tests := definitions.GetTestsByTags()
	require.Empty(t, tests)
}
