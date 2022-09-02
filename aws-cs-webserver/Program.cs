// Copyright 2016-2022, Pulumi Corporation.  All rights reserved.
using System.Collections.Generic;
using Pulumi;
using Pulumi.Aws.Ec2;
using Pulumi.Aws.Ec2.Inputs;

await Deployment.RunAsync(() =>
{
    var ami = GetAmi.Invoke(new GetAmiInvokeArgs
    {
        MostRecent = true,
        Owners = {"137112412989"},
        Filters = {new GetAmiFilterInputArgs {Name = "name", Values = "amzn-ami-hvm-*"}}
    });

    var group = new SecurityGroup("web-secgrp", new SecurityGroupArgs
    {
        Description = "Enable HTTP access",
        Ingress =
        {
            new SecurityGroupIngressArgs
            {
                Protocol = "tcp",
                FromPort = 80,
                ToPort = 80,
                CidrBlocks = {"0.0.0.0/0"}
            }
        }
    });

    var userData = @"
#!/bin/bash
echo ""Hello, World!"" > index.html
nohup python -m SimpleHTTPServer 80 &
";

    var server = new Instance("web-server-www", new InstanceArgs
    {
        InstanceType = "t2.micro",
        VpcSecurityGroupIds = {group.Id},
        UserData = userData,
        Ami = ami.Apply(a => a.Id)
    });

    return new Dictionary<string, object?>
    {
        ["publicId"] = server.PublicIp,
        ["publicDns"] = server.PublicDns
    };
});