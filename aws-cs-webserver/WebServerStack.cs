// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;
using Pulumi.Aws.Ec2;
using Pulumi.Aws.Ec2.Inputs;

class WebServerStack : Stack
{
    public WebServerStack()
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
            InstanceType = Size,
            VpcSecurityGroupIds = {group.Id},
            UserData = userData,
            Ami = ami.Apply(a => a.Id)
        });

        this.PublicIp = server.PublicIp;
        this.PublicDns = server.PublicDns;
    }

    [Output] public Output<string> PublicIp { get; set; }

    [Output] public Output<string> PublicDns { get; set; }

    private const string Size = "t2.micro";
}
