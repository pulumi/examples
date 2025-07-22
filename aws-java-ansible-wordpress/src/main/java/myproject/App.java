// Copyright 2022, Pulumi Corporation.

package myproject;

import java.util.*;
import java.io.*;
import java.nio.*;
import java.nio.file.*;
import com.pulumi.*;
import com.pulumi.aws.*;
import com.pulumi.aws.inputs.*;
import com.pulumi.aws.ec2.*;
import com.pulumi.aws.ec2.inputs.*;
import com.pulumi.command.local.*;
import com.pulumi.command.remote.*;
import com.pulumi.core.*;
import com.pulumi.resources.CustomResourceOptions;
import com.pulumi.aws.rds.SubnetGroup;
import com.pulumi.aws.rds.SubnetGroupArgs;
import com.pulumi.aws.ec2.inputs.GetAmiArgs;
import com.pulumi.aws.ec2.inputs.GetAmiFilterArgs;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    public static void stack(Context ctx) {
        final var config = ctx.config();
        // A path to the EC2 keypair's public key:
        final var publicKeyPath = config.require("publicKeyPath");
        // A path to the EC2 keypair's private key:
        final var privateKeyPath = config.require("privateKeyPath");
        // The WordPress database size:
        final var dbInstanceSize = config.get("dbInstanceSize").orElse("db.t3.small");
        // The WordPress database name:
        final var dbName = config.get("dbName").orElse("wordpressdb");
        // The WordPress database user's name:
        final var dbUsername = config.get("dbUsername").orElse("admin");
        // The WordPress database user's password:
        final var dbPassword = config.requireSecret("dbPassword");
        // The WordPress EC2 instance's size:
        final var ec2InstanceSize = config.get("ec2InstanceSize").orElse("t3.small");

        // Dynamically fetch AZs so we can spread across them.
        final var availabilityZones = AwsFunctions.getAvailabilityZones(GetAvailabilityZonesArgs.builder().build());
        // Dynamically query for the Amazon Linux 2 AMI in this region.
        final var awsLinuxAmi = Ec2Functions.getAmi(GetAmiArgs.builder()
            .owners("amazon")
            .filters(GetAmiFilterArgs.builder()
                .name("name")
                .values("amzn2-ami-hvm-*-x86_64-ebs")
                .build())
            .mostRecent(true)
            .build());

        // Read in the public key for easy use below.
        final var publicKey = readFile(publicKeyPath, "public key");
        // Read in the private key for easy use below (and to ensure it's marked a secret!)
        final var privateKey = Output.of(readFile(privateKeyPath, "private key")).asSecret();

        var prodVpc = new Vpc("prodVpc", VpcArgs.builder()
            .cidrBlock("10.192.0.0/16")
            .enableDnsSupport(true)
            .enableDnsHostnames(true)
            .instanceTenancy("default")
            .build());

        var prodSubnetPublic1 = new Subnet("prodSubnetPublic1", SubnetArgs.builder()
            .vpcId(prodVpc.id())
            .cidrBlock("10.192.0.0/24")
            .mapPublicIpOnLaunch(true)
            .availabilityZone(availabilityZones.applyValue(azs -> azs.names().get(0)))
            .build());

        var prodSubnetPrivate1 = new Subnet("prodSubnetPrivate1", SubnetArgs.builder()
            .vpcId(prodVpc.id())
            .cidrBlock("10.192.20.0/24")
            .mapPublicIpOnLaunch(false)
            .availabilityZone(availabilityZones.applyValue(azs -> azs.names().get(1)))
            .build());

        var prodSubnetPrivate2 = new Subnet("prodSubnetPrivate2", SubnetArgs.builder()
            .vpcId(prodVpc.id())
            .cidrBlock("10.192.21.0/24")
            .mapPublicIpOnLaunch(false)
            .availabilityZone(availabilityZones.applyValue(azs -> azs.names().get(2)))
            .build());

        var prodIgw = new InternetGateway("prodIgw", InternetGatewayArgs.builder()
            .vpcId(prodVpc.id())
            .build());

        var prodPublicCrt = new RouteTable("prodPublicCrt", RouteTableArgs.builder()
            .vpcId(prodVpc.id())
            .routes(RouteTableRouteArgs.builder()
                .cidrBlock("0.0.0.0/0")
                .gatewayId(prodIgw.id())
                .build())
            .build());

        var prodCrtaPublicSubnet1 = new RouteTableAssociation("prodCrtaPublicSubnet1", RouteTableAssociationArgs.builder()
            .subnetId(prodSubnetPublic1.id())
            .routeTableId(prodPublicCrt.id())
            .build());

        var ec2AllowRule = new SecurityGroup("ec2AllowRule", SecurityGroupArgs.builder()
            .vpcId(prodVpc.id())
            .ingress(
                SecurityGroupIngressArgs.builder()
                    .description("ANY")
                    .fromPort(0)
                    .toPort(0)
                    .protocol("-1")
                    .cidrBlocks("0.0.0.0/0")
                    .build(),
                SecurityGroupIngressArgs.builder()
                    .description("HTTPS")
                    .fromPort(443)
                    .toPort(443)
                    .protocol("tcp")
                    .cidrBlocks("0.0.0.0/0")
                    .build(),
                SecurityGroupIngressArgs.builder()
                    .description("HTTP")
                    .fromPort(80)
                    .toPort(80)
                    .protocol("tcp")
                    .cidrBlocks("0.0.0.0/0")
                    .build(),
                SecurityGroupIngressArgs.builder()
                    .description("MYSQL/Aurora")
                    .fromPort(3306)
                    .toPort(3306)
                    .protocol("tcp")
                    .cidrBlocks("0.0.0.0/0")
                    .build(),
                SecurityGroupIngressArgs.builder()
                    .description("SSH")
                    .fromPort(22)
                    .toPort(22)
                    .protocol("tcp")
                    .cidrBlocks("0.0.0.0/0")
                    .build())
            .egress(SecurityGroupEgressArgs.builder()
                .fromPort(0)
                .toPort(0)
                .protocol("-1")
                .cidrBlocks("0.0.0.0/0")
                .build())
            .tags(Map.of("Name", "allow ssh,http,https"))
            .build());

        var rdsAllowRule = new SecurityGroup("rdsAllowRule", SecurityGroupArgs.builder()
            .vpcId(prodVpc.id())
            .ingress(SecurityGroupIngressArgs.builder()
                .fromPort(3306)
                .toPort(3306)
                .protocol("tcp")
                .securityGroups(ec2AllowRule.id().applyValue(List::of))
                .build())
            .egress(SecurityGroupEgressArgs.builder()
                .fromPort(0)
                .toPort(0)
                .protocol("-1")
                .cidrBlocks("0.0.0.0/0")
                .build())
            .tags(Map.of("Name", "allow ec2"))
            .build());

        Output<List<String>> subnetIds = Output.all(prodSubnetPrivate1.id(), prodSubnetPrivate2.id())
            .applyValue(ids -> List.of((String) ids.get(0), (String) ids.get(1)));
        var rdsSubnetGrp = new SubnetGroup("rdssubnetgrp", SubnetGroupArgs.builder()
            .subnetIds(subnetIds)
            .build());

        var wordpressdb = new com.pulumi.aws.rds.Instance("wordpressdb",
            com.pulumi.aws.rds.InstanceArgs.builder()
                .allocatedStorage(10)
                .engine("mysql")
                .engineVersion("5.7")
                .instanceClass(dbInstanceSize)
                .dbSubnetGroupName(rdsSubnetGrp.id())
                .vpcSecurityGroupIds(rdsAllowRule.id().applyValue(List::of))
                .dbName(dbName)
                .username(dbUsername)
                .password(dbPassword)
                .skipFinalSnapshot(true)
                .build());

        var wordpressKeypair = new KeyPair("wordpressKeypair", KeyPairArgs.builder()
            .publicKey(publicKey)
            .build());

        var wordpressInstance = new com.pulumi.aws.ec2.Instance("wordpressInstance",
            com.pulumi.aws.ec2.InstanceArgs.builder()
                .ami(awsLinuxAmi.applyValue(amiResult -> amiResult.id()))
                .instanceType(ec2InstanceSize)
                .subnetId(prodSubnetPublic1.id())
                .vpcSecurityGroupIds(ec2AllowRule.id().applyValue(List::of))
                .keyName(wordpressKeypair.id())
                .tags(Map.of("Name", "Wordpress.web"))
                .build(),
            CustomResourceOptions.builder()
                .dependsOn(wordpressdb)
                .build());

        var wordpressEip = new Eip("wordpressEip", EipArgs.builder()
            .instance(wordpressInstance.id())
            .build());

        // Convert Output<Optional<String>> to Output<String> for password
        Output<String> dbPasswordString = wordpressdb.password().applyValue(opt -> opt.orElse(""));
        var renderPlaybookCmd = new com.pulumi.command.local.Command("renderPlaybookCmd", com.pulumi.command.local.CommandArgs.builder()
            .create("cat playbook.yml | envsubst > playbook_rendered.yml")
            .environment(
                Output.all(List.of(
                    wordpressdb.endpoint().applyValue(String::valueOf),
                    wordpressdb.dbName().applyValue(String::valueOf),
                    wordpressdb.username().applyValue(String::valueOf),
                    dbPasswordString.applyValue(String::valueOf)
                )).applyValue(values -> Map.of(
                    "DB_RDS", (String) values.get(0),
                    "DB_NAME", (String) values.get(1),
                    "DB_USERNAME", (String) values.get(2),
                    "DB_PASSWORD", (String) values.get(3)
                ))
            )
            .build());

        var updatePythonCmd = new com.pulumi.command.local.Command("updatePythonCmd", com.pulumi.command.local.CommandArgs.builder()
            .create("echo 'This runs locally, not on the EC2 instance.'")
            .build());

        var playAnsiblePlaybookCmd = new com.pulumi.command.local.Command("playAnsiblePlaybookCmd", com.pulumi.command.local.CommandArgs.builder()
            .create(wordpressEip.publicIp().applyValue(publicIp -> String.format("ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook -u ec2-user -i '%s,' --private-key %s playbook_rendered.yml", publicIp,privateKeyPath)))
            .build(), CustomResourceOptions.builder()
                .dependsOn(
                    renderPlaybookCmd,
                    updatePythonCmd)
                .build());

        ctx.export("url", wordpressEip.publicIp());
    }

    private static String readFile(String path, String description) {
        try {
            return Files.readString(Path.of(path));
        } catch (IOException e) {
            throw new RuntimeException("Failed to read " + description + " file", e);
        }
    }
}
