package com.pulumi.example.eksminimal;

import java.util.List;
import java.util.stream.Collectors;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.aws.ec2.Ec2Functions;
import com.pulumi.aws.ec2.inputs.GetSubnetsArgs;
import com.pulumi.aws.ec2.inputs.GetSubnetsFilterArgs;
import com.pulumi.aws.ec2.inputs.GetVpcArgs;
import com.pulumi.aws.ec2.outputs.GetVpcResult;
import com.pulumi.eks.Cluster;
import com.pulumi.eks.ClusterArgs;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {    
        var vpcIdOutput = Ec2Functions.getVpc(
                GetVpcArgs.builder().default_(true).build()
        ).applyValue(GetVpcResult::id);
        ctx.export("vpcIdOutput", vpcIdOutput);

        var subnetIdsOutput = Ec2Functions.getSubnets(GetSubnetsArgs.builder()
                .filters(GetSubnetsFilterArgs.builder()
                        .name("vpc-id")
                        .values(vpcIdOutput.applyValue(List::of))
                        .build())
                .build())
                .applyValue(getSubnetsResult -> getSubnetsResult.ids()
                        .stream()
                        .sorted()
                        .limit(2)
                        .collect(Collectors.toList()));

        ctx.export("subnetIdsOutput", subnetIdsOutput.applyValue(vs -> String.join(",", vs)));

        var cluster = new Cluster("my-cluster", ClusterArgs.builder()
                .vpcId(vpcIdOutput)
                .subnetIds(subnetIdsOutput)
                .instanceType("t2.micro")
                .minSize(1)
                .maxSize(2)
                .build());

        ctx.export("kubeconfig", cluster.kubeconfig());
    }
}
