// Copyright 2016-2020, Pulumi Corporation

using Pulumi;
using Pulumi.Aws.Ec2;
using Pulumi.Aws.Ec2.Inputs;

/// <summary>
/// A simple stack to be tested.
/// </summary>
public class WebserverStack : Stack
{
    public WebserverStack()
    {
        var group = new SecurityGroup("web-secgrp", new SecurityGroupArgs
        {
            Ingress =
            {
                // Uncomment to fail a test:
                // new SecurityGroupIngressArgs { Protocol = "tcp", FromPort = 22, ToPort = 22, CidrBlocks = { "0.0.0.0/0" } },
                new SecurityGroupIngressArgs { Protocol = "tcp", FromPort = 80, ToPort = 80, CidrBlocks = { "0.0.0.0/0" } }
            }
        });
        
        // var userData = "#!/bin/bash echo \"Hello, World!\" > index.html nohup python -m SimpleHTTPServer 80 &";

        var server = new Instance("web-server-www", new InstanceArgs
        {
            InstanceType = "t2.micro",
            SecurityGroups = { group.Name }, // reference the group object above
            Ami = "ami-c55673a0",            // AMI for us-east-2 (Ohio),
            // Comment out to fail a test:
            Tags = { { "Name", "webserver" }},
            // Uncomment to fail a test:
            // UserData = userData           // start a simple webserver
        });
    }
}
