package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

func main() {
	resourceCount := getEnvInt("RESOURCE_COUNT", 64)
	resourcePayloadBytes := getEnvInt("RESOURCE_PAYLOAD_BYTES", 1024)

	pulumi.Run(func(ctx *pulumi.Context) error {
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

func getEnvInt(name string, defaultValue int) int {
	v := os.Getenv(name)
	if v == "" {
		return defaultValue
	}

	intv, err := strconv.Atoi(v)
	if err != nil {
		return defaultValue
	}

	return intv
}
