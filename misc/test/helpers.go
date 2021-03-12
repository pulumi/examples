package test

import (
	"os"
	"path"
	"strings"
	"testing"

	"github.com/pulumi/pulumi/pkg/v2/testing/integration"
	"github.com/stretchr/testify/assert"
)

func checkExamples(
	t *testing.T,
	mainTestFile string,
	folderNameFragment string,
	overrides []test,
	baselineOptions func(t *testing.T) integration.ProgramTestOptions) {

	byName := make(map[string]test)

	for _, example := range overrides {
		byName[example.name] = example
	}

	exampleFolders := discoverTests(t, folderNameFragment)

	for _, testName := range exampleFolders {
		test, gotTest := byName[testName]

		if !gotTest {
			t.Run(test.name, func(t *testing.T) {
				t.Errorf("Must edit %s to configure CI to either explicitly skip %s example or run it",
					mainTestFile, test.name)
			})
		} else {

			t.Run(test.name, func(t *testing.T) {
				if test.skipped {
					t.SkipNow()
				} else {
					opts := baselineOptions(t).
						With(test.opts).
						With(dirOption(t, test.name))
					integration.ProgramTest(t, &opts)
				}
			})
		}
	}
}

type test struct {
	name    string
	opts    integration.ProgramTestOptions
	skipped bool
}

func (x test) conf(name string, value string) test {
	x.opts.Config[name] = value
	return x
}

func (x test) checkHttp(endpointOutputName string, expectedBodyText string) test {
	x.opts.ExtraRuntimeValidation = func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		assertHTTPResult(t, stack.Outputs[endpointOutputName].(string), nil, func(body string) bool {
			return assert.Contains(t, body, expectedBodyText)
		})
	}
	return x
}

func (x test) checkAppService(endpointOutputName string, expectedBodyText string) test {
	x.opts.ExtraRuntimeValidation = func(t *testing.T, stack integration.RuntimeValidationStackInfo) {
		assertAppServiceResult(t, stack.Outputs[endpointOutputName].(string), func(body string) bool {
			return assert.Contains(t, body, expectedBodyText)
		})
	}
	return x
}

func (x test) skip() test {
	x.skipped = true
	return x
}

func defTest(testName string) test {
	return test{name: testName, opts: integration.ProgramTestOptions{
		Config: make(map[string]string),
	}}
}

func dirOption(t *testing.T, testName string) integration.ProgramTestOptions {
	opts := integration.ProgramTestOptions{}
	opts.Dir = path.Join(getCwd(t), "..", "..", testName)
	return opts
}

func discoverTests(t *testing.T, folderNameFragment string) []string {
	var found []string

	files, err := os.ReadDir("../..")
	if err != nil {
		t.Error(err)
	}

	for _, f := range files {
		name := f.Name()
		if f.IsDir() && strings.Contains(name, folderNameFragment) {
			found = append(found, name)
		}
	}

	return found
}
