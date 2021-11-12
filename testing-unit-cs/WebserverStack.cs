// Copyright 2016-2020, Pulumi Corporation

using Pulumi;
//using Pulumi.Aws;
using Pulumi.Aws.Ec2;
using Pulumi.Aws.Ec2.Inputs;
// using Pulumi.Aws.Inputs;

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

        var amiId = GetAmi
            .Invoke(new GetAmiInvokeArgs
            {
                MostRecent = true,
                Owners = "099720109477",
                Filters = {
                    new GetAmiFilterInputArgs
                    {
                        Name = "name",
                        Values = "ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*",
                    }
                }
            })
            .Apply(ami => ami.Id);

        // var userData = "#!/bin/bash echo \"Hello, World!\" > index.html nohup python -m SimpleHTTPServer 80 &";

        var server = new Instance("web-server-www", new InstanceArgs
        {
            InstanceType = "t2.micro",
            VpcSecurityGroupIds = { group.Id }, // reference the group object above
            Ami = amiId,
            // Comment out to fail a test:
            Tags = { { "Name", "webserver" }},
            // Uncomment to fail a test:
            // UserData = userData           // start a simple webserver
        });
    }
}
