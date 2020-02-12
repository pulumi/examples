package function

import (
	"strings"

	"github.com/pulumi/pulumi/sdk/go/pulumi"
)

// Handler is a simple function that takes a string and does a ToUpper.
func Handler(input string, ctx *pulumi.Context) string {
	return strings.ToUpper(input)
}
