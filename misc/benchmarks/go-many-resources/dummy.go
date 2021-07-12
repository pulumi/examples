package main

import (
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type Dummy struct {
	pulumi.ResourceState

	Deadweight pulumi.StringOutput `pulumi:"deadweight"`
}

type DummyArgs struct {
	Deadweight pulumi.StringInput
}

func NewDummy(ctx *pulumi.Context, name string, args *DummyArgs, opts ...pulumi.ResourceOption) (*Dummy, error) {
	dummy := &Dummy{}
	err := ctx.RegisterComponentResource("examples:dummy:Dummy", name, dummy, opts...)
	if err != nil {
		return nil, err
	}
	dummy.Deadweight = args.Deadweight.ToStringOutput()
	ctx.RegisterResourceOutputs(dummy, pulumi.Map{
		"deadweight": dummy.Deadweight,
	})
	return dummy, nil
}
