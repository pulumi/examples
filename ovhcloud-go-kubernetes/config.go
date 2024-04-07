package main

import (
	"fmt"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

const OvhApplicationKey = "OVH_APPLICATION_KEY"
const OvhApplicationSecret = "OVH_APPLICATION_SECRET"
const OvhConsumerKey = "OVH_CONSUMER_KEY"
const OvhServiceName = "OVH_SERVICE_NAME"
const OvhGroup = "ovh"
const FLAVOR = "flavor"
const REGION = "region"

func ovhConfig(ctx *pulumi.Context, key string) string {
	return getConfig(ctx, OvhGroup, key)
}

// Cluster config keys
const ClusterGroup = "cluster"
const NAME = "name"
const NodePool = "nodepool"
const MinNodes = "min_nodes"
const MaxNodes = "max_nodes"

func clusterConfig(ctx *pulumi.Context, key string) string {
	return getConfig(ctx, ClusterGroup, key)
}

func getConfig(ctx *pulumi.Context, group string, key string) string {
	return config.Require(ctx, fmt.Sprintf("%s:%s", group, key))
}
