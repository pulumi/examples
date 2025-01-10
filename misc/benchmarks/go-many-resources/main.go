package main

import (
	b64 "encoding/base64"
	"fmt"
	"math/rand"

	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		conf := config.New(ctx, "")
		resourceCount := conf.RequireInt("resource_count")
		resourcePayloadBytes := conf.RequireInt("resource_payload_bytes")

		for i := 0; i < resourceCount; i++ {
			deadweight := pseudoRandomString(resourcePayloadBytes)
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

func pseudoRandomString(desiredLength int) string {
	fmt.Printf("pseudoRandomString n=%d\n", desiredLength)
	buf := make([]byte, desiredLength)
	rand.Read(buf)
	text := b64.StdEncoding.EncodeToString(buf)
	text = text[0:desiredLength]
	if len(text) != desiredLength {
		panic("assertion failed: len(text) != desiredLength")
	}
	fmt.Printf("pseudoRandomString done n=%d\n", len(text))
	return text
}
