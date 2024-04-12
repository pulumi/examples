package webserver;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.aws.ec2.Ec2Functions;
import com.pulumi.aws.ec2.Instance;
import com.pulumi.aws.ec2.InstanceArgs;
import com.pulumi.aws.ec2.SecurityGroup;
import com.pulumi.aws.ec2.SecurityGroupArgs;
import com.pulumi.aws.ec2.inputs.GetAmiArgs;
import com.pulumi.aws.ec2.inputs.GetAmiFilterArgs;
import com.pulumi.aws.ec2.inputs.SecurityGroupIngressArgs;
import com.pulumi.aws.ec2.outputs.GetAmiResult;
import com.pulumi.core.Output;

import java.util.List;
import java.util.Map;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        final var ami = Ec2Functions.getAmi(GetAmiArgs.builder()
                .filters(GetAmiFilterArgs.builder()
                        .name("name")
                        .values("amzn2-ami-hvm-2.0.20231218.0-x86_64-ebs")
                        .build())
                .owners("137112412989")
                .mostRecent(true)
                .build()
        ).applyValue(result -> result.id());

        final var group = new SecurityGroup("web-secgrp", SecurityGroupArgs.builder()
                .ingress(SecurityGroupIngressArgs.builder()
                        .protocol("tcp")
                        .fromPort(80)
                        .toPort(80)
                        .cidrBlocks("0.0.0.0/0")
                        .build())
                .build()
        );

        // (optional) create a simple web server using the startup
        // script for the instance

        final var userData =
                "#!/bin/bash\n" +
                        "echo \"Hello, World!\" > index.html\n" +
                        "nohup python -m SimpleHTTPServer 80 &";

        final var server = new Instance("web-server-www", InstanceArgs.builder()
                .tags(Map.of("Name", "web-server-www"))
                .instanceType(Output.ofRight(com.pulumi.aws.ec2.enums.InstanceType.T2_Micro))
                .vpcSecurityGroupIds(group.getId().applyValue(List::of))
                .ami(ami)
                .userData(userData)
                .build()
        );

        ctx.export("publicIp", server.publicIp());
        ctx.export("publicHostName", server.publicDns());
    }
}
