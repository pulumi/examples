package definitions

import "github.com/pulumi/pulumi/pkg/v3/testing/integration"

type Tag string

const (
	CS     Tag = "csharp"
	FS     Tag = "fs"
	Go     Tag = "go"
	Java   Tag = "java"
	JS     Tag = "js"
	Python Tag = "py"
	TS     Tag = "ts"
)

type TestDefinition struct {
	Tags    []Tag
	Dir     string
	Options integration.ProgramTestOptions
}

type TestDefinitions []TestDefinition

// GetByTags returns all tests that have _all_ of the given tags. No tags returns an empty result.
func (td TestDefinitions) GetByTags(tags ...Tag) TestDefinitions {
	result := TestDefinitions{}
	if len(tags) == 0 {
		return result
	}

	hasAllTags := func(testTags []Tag) bool {
		for _, tag := range tags {
			has := false
			for _, testTag := range testTags {
				if testTag == tag {
					has = true
					break
				}
			}
			if !has {
				return false
			}
		}
		return true
	}

	for _, test := range td {
		if hasAllTags(test.Tags) {
			result = append(result, test)
		}
	}

	return result
}

func AllTests() TestDefinitions {
	return concat(AzureNativeTests, AzureTests)
}

func GetTestsByTags(tags ...Tag) TestDefinitions {
	return AllTests().GetByTags(tags...)
}

func concat(defs ...TestDefinitions) TestDefinitions {
	result := TestDefinitions{}
	for _, d := range defs {
		result = append(result, d...)
	}
	return result
}
