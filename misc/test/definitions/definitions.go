package definitions

import "github.com/pulumi/pulumi/pkg/v3/testing/integration"

const (
	CS     = "cs"
	FS     = "fs"
	Go     = "go"
	JAVA   = "java"
	Python = "py"
	TS     = "ts"
)

type TestDefinition struct {
	Tags    []string
	Dir     string
	Options integration.ProgramTestOptions
}

type TestDefinitions []TestDefinition

func (td TestDefinitions) GetTestsForTag(tag string) TestDefinitions {
	result := TestDefinitions{}
	for _, test := range td {
		for _, t := range test.Tags {
			if t == tag {
				result = append(result, test)
			}
		}
	}
	return result
}

func (td TestDefinitions) GetTestsForTags(tag1, tag2 string) TestDefinitions {
	return td.GetTestsForTag(tag1).GetTestsForTag(tag2)
}

func AllTests() TestDefinitions {
	return concat(AzureNativeTests, AzureTests)
}

func GetTestsForTag(tag string) TestDefinitions {
	return AllTests().GetTestsForTag(tag)
}

func concat(defs ...TestDefinitions) TestDefinitions {
	result := TestDefinitions{}
	for _, d := range defs {
		result = append(result, d...)
	}
	return result
}
