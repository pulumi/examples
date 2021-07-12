package main

import (
	"fmt"
	"strings"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		conf := config.New(ctx, "")
		resourceCount := conf.RequireInt("resource_count")
		resourcePayloadBytes := conf.RequireInt("resource_payload_bytes")

		for i := 0; i < resourceCount; i++ {
			deadweight := strings.Repeat(fmt.Sprintf("%08d", i), resourcePayloadBytes/8)

			dummy, err := NewDummy(ctx, fmt.Sprintf("dummy-%d", i), &DummyArgs{
				Deadweight: pulumi.String(deadweight),
			})
			if err != nil {
				return err
			}

			if i == 0 {
				ctx.Export("ResourcePayloadBytes", dummy.Deadweight.ApplyT(func(x string) int {
					return len(x)
				}))
			}
		}

		ctx.Export("ResourceCount", pulumi.Int(resourceCount))
		return nil
	})
}
