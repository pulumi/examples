package main

import (
	"fmt"
	"io/ioutil"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		strVar := "foo"
		arrVar := []string{"fizz", "buzz"}

		readmeBytes, err := ioutil.ReadFile("./Pulumi.README.md")
		if err != nil {
			return fmt.Errorf("failed to read readme: %w", err)
		}
		ctx.Export("strVar", pulumi.String(strVar))
		ctx.Export("arrVar", pulumi.ToStringArray(arrVar))
		ctx.Export("readme", pulumi.String(string(readmeBytes)))

		return nil
	})
}
