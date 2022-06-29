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
        final var awsLinuxAmi = Ec2Functions.getAmi(com.pulumi.aws.ec2.inputs.GetAmiArgs.builder()
            .owners("amazon")
            .filters(com.pulumi.aws.ec2.inputs.GetAmiFilter.builder()
                .name("name")
                .values("amzn2-ami-hvm-*-x86_64-ebs")
                .build())
            .mostRecent(true)
            .build());

        // Read in the public key for easy use below.
        final var publicKey = Files.readString(Path.of(publicKeyPath));
        // Read in the private key for easy use below (and to ensure it's marked a secret!)
        final var privateKey = Output.of(Files.readString(Path.of(privateKeyPath))).asSecret();

        var prodVpc = new Vpc("prodVpc", VpcArgs.builder()        
            .cidrBlock("10.192.0.0/16")
            .enableDnsSupport(true)
            .enableDnsHostnames(true)
            .enableClassiclink(false)
            .instanceTenancy("default")
            .build());

        var prodSubnetPublic1 = new Subnet("prodSubnetPublic1", SubnetArgs.builder()        
            .vpcId(prodVpc.getId())
            .cidrBlock("10.192.0.0/24")
            .mapPublicIpOnLaunch(true)
            .availabilityZone(Output.of(availabilityZones.thenApply(azs -> azs.names().get(0))))
            .build());

        var prodSubnetPrivate1 = new Subnet("prodSubnetPrivate1", SubnetArgs.builder()        
            .vpcId(prodVpc.getId())
            .cidrBlock("10.192.20.0/24")
            .mapPublicIpOnLaunch(false)
            .availabilityZone(Output.of(availabilityZones.thenApply(azs -> azs.names().get(1))))
            .build());

        var prodSubnetPrivate2 = new Subnet("prodSubnetPrivate2", SubnetArgs.builder()        
            .vpcId(prodVpc.getId())
            .cidrBlock("10.192.21.0/24")
            .mapPublicIpOnLaunch(false)
            .availabilityZone(Output.of(availabilityZones.thenApply(azs -> azs.names().get(2))))
            .build());

        var prodIgw = new InternetGateway("prodIgw", InternetGatewayArgs.builder()        
            .vpcId(prodVpc.getId())
            .build());

        var prodPublicCrt = new RouteTable("prodPublicCrt", RouteTableArgs.builder()        
            .vpcId(prodVpc.getId())
            .routes(RouteTableRouteArgs.builder()
                .cidrBlock("0.0.0.0/0")
                .gatewayId(prodIgw.getId())
                .build())
            .build());

        var prodCrtaPublicSubnet1 = new RouteTableAssociation("prodCrtaPublicSubnet1", RouteTableAssociationArgs.builder()        
            .subnetId(prodSubnetPublic1.getId())
            .routeTableId(prodPublicCrt.getId())
            .build());

        var ec2AllowRule = new SecurityGroup("ec2AllowRule", SecurityGroupArgs.builder()        
            .vpcId(prodVpc.getId())
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
            .vpcId(prodVpc.getId())
            .ingress(SecurityGroupIngressArgs.builder()
                .fromPort(3306)
                .toPort(3306)
                .protocol("tcp")
                .securityGroups(ec2AllowRule.getId())
                .build())
            .egress(SecurityGroupEgressArgs.builder()
                .fromPort(0)
                .toPort(0)
                .protocol("-1")
                .cidrBlocks("0.0.0.0/0")
                .build())
            .tags(Map.of("Name", "allow ec2"))
            .build());

        var rdsSubnetGrp = new SubnetGroup("rdsSubnetGrp", SubnetGroupArgs.builder()        
            .subnetIds(            
                prodSubnetPrivate1.getId(),
                prodSubnetPrivate2.getId())
            .build());

        var wordpressdb = new com.pulumi.aws.rds.Instance("wordpressdb",
            com.pulumi.aws.rds.InstanceArgs.builder()
                .allocatedStorage(10)
                .engine("mysql")
                .engineVersion("5.7")
                .instanceClass(dbInstanceSize)
                .dbSubnetGroupName(rdsSubnetGrp.getId())
                .vpcSecurityGroupIds(rdsAllowRule.getId())
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
                .ami(Output.of(awsLinuxAmi.thenApply(amiResult -> amiResult.id())))
                .instanceType(ec2InstanceSize)
                .subnetId(prodSubnetPublic1.getId())
                .vpcSecurityGroupIds(c2AllowRule.getId())
                .keyName(wordpressKeypair.getId())
                .tags(Map.of("Name", "Wordpress.web"))
                .build(),
            CustomResourceOptions.builder()
                .dependsOn(wordpressdb)
                .build());

        var wordpressEip = new Eip("wordpressEip", EipArgs.builder()        
            .instance(wordpressInstance.getId())
            .build());

        var renderPlaybookCmd = new Command("renderPlaybookCmd", CommandArgs.builder()        
            .create("cat playbook.yml | envsubst > playbook_rendered.yml")
            .environment(Map.ofEntries(
                Map.entry("DB_RDS", wordpressdb.endpoint()),
                Map.entry("DB_NAME", wordpressdb.name()),
                Map.entry("DB_USERNAME", wordpressdb.username()),
                Map.entry("DB_PASSWORD", wordpressdb.password())
            ))
            .build());

        var updatePythonCmd = new Command("updatePythonCmd", CommandArgs.builder()        
            .connection(ConnectionArgs.builder()
                .host(wordpressEip.publicIp())
                .port(22)
                .user("ec2-user")
                .privateKey(privateKey)
                .build())
            .create("""
(sudo yum update -y || true); (sudo yum install python35 -y); (sudo yum install amazon-linux-extras -y)
            """)
            .build());

        var playAnsiblePlaybookCmd = new Command("playAnsiblePlaybookCmd", CommandArgs.builder()        
            .create(wordpressEip.publicIp().apply(publicIp -> String.format("ANSIBLE_HOST_KEY_CHECKING=False ansible-playbook -u ec2-user -i '%s,' --private-key %s playbook_rendered.yml", publicIp,privateKeyPath)))
            .build(), CustomResourceOptions.builder()
                .dependsOn(                
                    renderPlaybookCmd,
                    updatePythonCmd)
                .build());

        ctx.export("url", wordpressEip.publicIp());
    }
}
