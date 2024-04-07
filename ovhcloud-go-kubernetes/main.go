package main

import (
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"os"
	"slices"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {

		// Check requirements
		checkRequirements(ctx)

		// K8s part
		k8sCluster, _, err := initk8s(ctx)
		if err != nil {
			return err
		}
		ctx.Export("kubeconfig", k8sCluster.Kubeconfig)
		return nil
	})
}

func checkRequirements(ctx *pulumi.Context) {
	ovhVars := []string{os.Getenv(OvhApplicationSecret), os.Getenv(OvhApplicationKey),
		os.Getenv(OvhServiceName), os.Getenv(OvhConsumerKey)}
	if slices.Contains(ovhVars, "") {
		_ = ctx.Log.Error("A mandatory variable is missing, "+
			"check that all these variables are set: "+
			"OVH_APPLICATION_SECRET, OVH_APPLICATION_KEY, OVH_SERVICE_NAME, OVH_CONSUMER_KEY",
			nil)
	}
}
