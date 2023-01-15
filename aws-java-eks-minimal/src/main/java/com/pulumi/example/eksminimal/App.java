package com.pulumi.example.eksminimal;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.aws.ec2.Ec2Functions;
import com.pulumi.aws.ec2.inputs.GetSubnetsArgs;
import com.pulumi.aws.ec2.inputs.GetSubnetsFilterArgs;
import com.pulumi.aws.ec2.inputs.GetVpcArgs;
import com.pulumi.aws.ec2.outputs.GetVpcResult;
import com.pulumi.eks.Cluster;
import com.pulumi.eks.ClusterArgs;

import java.util.List;
import java.util.stream.Collectors;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {

        // Find the default VPC identifier.
        final var defaultVpcId = Ec2Functions.getVpc(
                GetVpcArgs.builder().default_(true).build()
        ).applyValue(GetVpcResult::id);

        // Export it for visibility via `pulumi stack output`.
        ctx.export("defaultVpcId", defaultVpcId);

        // Find all the subnets in the default VPC.
        final var allSubnetIds = Ec2Functions.getSubnets(GetSubnetsArgs.builder()
                        .filters(GetSubnetsFilterArgs.builder()
                                .name("vpc-id")
                                .values(defaultVpcId.applyValue(List::of))
                                .build())
                        .build())
                .applyValue(result -> result.ids()
                        .stream()
                        .sorted()
                        .limit(2)
                        .collect(Collectors.toList()));

        // Fail if there are not enough subnets available (the example requires at least 2).
        ctx.export("totalSubnetCount", allSubnetIds.applyValue(ids -> {
            final var n = ids.size();
            if (n < 2) {
                throw new RuntimeException(String.format(
                        "This example requires at least 2 subnets in the default VPC, but found only %s", n));
            }
            return n;
        }));

        // Select 2 subnets only to speed up the example.
        final var selectedSubnetIds = allSubnetIds
                .applyValue(ids -> ids.stream().limit(2).collect(Collectors.toList()));

        // Export it for visibility via `pulumi stack output`.
        ctx.export("selectedSubnetIds", selectedSubnetIds.applyValue(ids -> String.join(",", ids)));

        // Provision an EKS cluster in the given VPC and selected subnets.
        final var cluster = new Cluster("my-cluster", ClusterArgs.builder()
                .vpcId(defaultVpcId)
                .subnetIds(selectedSubnetIds)
                .instanceType("t2.micro")
                .minSize(1)
                .maxSize(2)
                .build());

        // Export `kubeconfig` to enable interacting with the cluster from the command line:
        //
        // $ pulumi stack output kubeconfig --show-secrets > kubeconfig
        // $ export KUBECONFIG=$PWD/kubeconfig
        // $ kubectl version
        // $ kubectl cluster-info
        // $ kubectl get nodes
        ctx.export("kubeconfig", cluster.kubeconfig());
    }
}
