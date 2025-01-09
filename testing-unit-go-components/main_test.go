package main

import (
	"context"
	"fmt"
	"testing"

	corev1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/core/v1"
	metav1 "github.com/pulumi/pulumi-kubernetes/sdk/v4/go/kubernetes/meta/v1"
	"github.com/pulumi/pulumi/sdk/v3/go/common/resource"
	"github.com/pulumi/pulumi/sdk/v3/go/common/util/contract"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/internals"
	"github.com/stretchr/testify/assert"
)

type mocks struct {
	Context *pulumi.Context
}

// Create the mocks.
func (m mocks) NewResource(args pulumi.MockResourceArgs) (string, resource.PropertyMap, error) {
	outputs := args.Inputs

	switch {
	case args.TypeToken == "kubernetes:helm.sh/v4:Chart" && args.RegisterRPC.Remote:
		// mock the Chart component resource by registering a child resource of type Service
		chart := &pulumi.ResourceState{}
		err := m.Context.RegisterComponentResource("kubernetes:helm.sh/v4:Chart", args.Name, chart)
		if err != nil {
			return "", nil, err
		}
		values := args.Inputs["values"].ObjectValue()

		svc, err := corev1.NewService(m.Context, args.Name+":default/nginx", &corev1.ServiceArgs{
			Metadata: &metav1.ObjectMetaArgs{
				Name:      pulumi.String("nginx"),
				Namespace: pulumi.String("default"),
			},
			Spec: &corev1.ServiceSpecArgs{
				Type: pulumi.StringPtr(values["serviceType"].StringValue()),
			},
		}, pulumi.Parent(chart))
		if err != nil {
			return "", nil, err
		}

		outputs["resources"] = resource.NewArrayProperty([]resource.PropertyValue{
			makeResourceReference(m.Context.Context(), svc),
		})
		return "", outputs, nil

	case args.TypeToken == "kubernetes:core/v1:Service":
		// mock the Service resource by returning a fake ingress IP address
		outputs["status"] = resource.NewObjectProperty(resource.NewPropertyMapFromMap(map[string]interface{}{
			"loadBalancer": map[string]interface{}{
				"ingress": []map[string]interface{}{
					{"ip": "127.0.0.1"},
				},
			},
		}))
		return "default/nginx", outputs, nil

	default:
		return args.ID, args.Inputs, nil
	}
}

func (mocks) Call(args pulumi.MockCallArgs) (resource.PropertyMap, error) {
	return nil, fmt.Errorf("not implemented")
}

func makeResourceReference(ctx context.Context, v pulumi.Resource) resource.PropertyValue {
	urn, err := internals.UnsafeAwaitOutput(ctx, v.URN())
	contract.AssertNoErrorf(err, "Failed to await URN: %v", err)
	contract.Assertf(urn.Known, "URN must be known")
	contract.Assertf(!urn.Secret, "URN must not be secret")

	if custom, ok := v.(pulumi.CustomResource); ok {
		id, err := internals.UnsafeAwaitOutput(ctx, custom.ID())
		contract.AssertNoErrorf(err, "Failed to await ID: %v", err)
		contract.Assertf(!id.Secret, "CustomResource must not have a secret ID")

		return resource.MakeCustomResourceReference(resource.URN(urn.Value.(pulumi.URN)), resource.ID(id.Value.(pulumi.ID)), "")
	}

	return resource.MakeComponentResourceReference(resource.URN(urn.Value.(pulumi.URN)), "")
}

// Applying unit tests.
func TestNginxComponent(t *testing.T) {
	mocks := &mocks{}

	err := pulumi.RunErr(
		func(ctx *pulumi.Context) error {
			mocks.Context = ctx

			await := func(v pulumi.Output) any {
				res, err := internals.UnsafeAwaitOutput(ctx.Context(), v)
				contract.AssertNoErrorf(err, "failed to await value: %v", err)
				return res.Value
			}

			// Execute the code that is to be tested.
			nginx, err := NewNginxComponent(ctx, "nginx", &NginxComponentArgs{
				ServiceType: pulumi.String("LoadBalancer"),
			})
			if err != nil {
				return err
			}

			// Test if the chart resource is configured correctly
			assert.NotNil(t, nginx.Chart, "chart is nil")
			resources := await(nginx.Chart.Resources).([]any)
			assert.Len(t, resources, 1, "chart has wrong number of children")
			svc := resources[0].(*corev1.Service)
			assert.NotNil(t, svc, "service resource is nil")
			svcType := await(svc.Spec.Type()).(*string)
			assert.NotNil(t, svc, "service type is nil")
			assert.Equal(t, "LoadBalancer", *svcType, "service type has unexpected value")

			// Test if the ingressIp output is set correctly
			ingressIp := await(nginx.IngressIp).(*string)
			assert.NotNil(t, ingressIp, "ingressIp is nil")
			assert.Equal(t, "127.0.0.1", *ingressIp, "ingressIp has unexpected value")

			return nil
		},
		pulumi.WithMocks("project", "stack", mocks),
	)
	assert.NoError(t, err, "expected run to succeed")
}
