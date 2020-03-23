// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

package examples

import (
	"os"
	"path"
	"testing"

	"github.com/pulumi/pulumi/pkg/testing/integration"
)

func TestSimple(t *testing.T) {
	cwd, err := os.Getwd()
	if err != nil {
		t.FailNow()
	}

	test := integration.ProgramTestOptions{
		Dir:                  path.Join(cwd, "program"),
		ExpectRefreshChanges: true,
	}
	integration.ProgramTest(t, &test)
}
