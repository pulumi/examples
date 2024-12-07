package main

import (
	"context"
	"errors"

	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/core/v1"
	helmv4 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/helm/v4"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type NginxComponentArgs struct {
	ServiceType pulumi.StringInput
}

// NginxComponent is a component that encapsulates an Nginx chart.
type nginxComponent struct {
	pulumi.ResourceState

	//Output properties of the component
	Chart     *helmv4.Chart          `pulumi:"chart"`
	IngressIp pulumi.StringPtrOutput `pulumi:"ingressIp"`
}

func NewNginxComponent(ctx *pulumi.Context, name string, args *NginxComponentArgs, opts ...pulumi.ResourceOption) (*nginxComponent, error) {
	component := &nginxComponent{}
	err := ctx.RegisterComponentResource("example:NginxComponent", name, component, opts...)
	if err != nil {
		return nil, err
	}

	chart, err := helmv4.NewChart(ctx, name, &helmv4.ChartArgs{
		Chart:   pulumi.String("oci://registry-1.docker.io/bitnamicharts/nginx"),
		Version: pulumi.String("16.0.7"),
		Values: pulumi.Map{
			"serviceType": args.ServiceType,
		},
	}, pulumi.Parent(component))
	if err != nil {
		return nil, err
	}
	component.Chart = chart

	ingressIp := chart.Resources.ApplyTWithContext(ctx.Context(), func(ctx context.Context, resources []any) (pulumi.StringPtrOutput, error) {
		for _, r := range resources {
			switch r := r.(type) {
			case *corev1.Service:
				return r.Status.LoadBalancer().Ingress().Index(pulumi.Int(0)).Ip(), nil
			}
		}
		return pulumi.StringPtrOutput{}, errors.New("service not found")
	}).(pulumi.StringPtrOutput)
	component.IngressIp = ingressIp

	return component, err
}

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		nginx, err := NewNginxComponent(ctx, "nginx", &NginxComponentArgs{
			ServiceType: pulumi.String("LoadBalancer"),
		})
		if err != nil {
			return err
		}
		ctx.Export("ingressIp", nginx.IngressIp)
		return nil
	})
}
