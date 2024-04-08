package main

import (
	"github.com/ovh/pulumi-ovh/sdk/go/ovh/cloudproject"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"os"
	"strconv"
)

func initk8s(ctx *pulumi.Context) (*cloudproject.Kube, *cloudproject.KubeNodePool, error) {
	// Get ServiceName (ie your account ID in OVH)
	serviceName := os.Getenv(OvhServiceName)

	// Create a new Kubernetes cluster
	myKube, err := cloudproject.NewKube(ctx,
		clusterConfig(ctx, NAME),
		&cloudproject.KubeArgs{
			ServiceName: pulumi.String(serviceName),
			Region:      pulumi.String(clusterConfig(ctx, REGION)),
		})
	if err != nil {
		return nil, nil, err
	}

	// Export kubeconfig file to a secret
	ctx.Export("kubeconfig", pulumi.ToSecret(myKube.Kubeconfig))

	//Create a Node Pool for the cluster
	var minNodes, _ = strconv.Atoi(clusterConfig(ctx, MinNodes))
	var maxNodes, _ = strconv.Atoi(clusterConfig(ctx, MaxNodes))

	nodePool, err := cloudproject.NewKubeNodePool(ctx,
		clusterConfig(ctx, NodePool),
		&cloudproject.KubeNodePoolArgs{
			ServiceName:  pulumi.String(serviceName),
			KubeId:       myKube.ID(),
			DesiredNodes: pulumi.Int(minNodes),
			MaxNodes:     pulumi.Int(maxNodes),
			MinNodes:     pulumi.Int(minNodes),
			FlavorName:   pulumi.String(clusterConfig(ctx, FLAVOR)),
		})
	if err != nil {
		return nil, nil, err
	}
	return myKube, nodePool, nil
}
