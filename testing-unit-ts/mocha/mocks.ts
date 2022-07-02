// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

pulumi.runtime.setMocks({
    newResource: function (args: pulumi.runtime.MockResourceArgs): { id: string; state: any } {
        switch (args.type) {
            case "aws:ec2/securityGroup:SecurityGroup":
                return {
                    id: "sg-12345678",
                    state: {
                        ...args.inputs,

                        arn: "arn:aws:ec2:us-west-2:123456789012:security-group/sg-12345678",
                        name: args.inputs.name || args.name + "-sg",
                    },
                };
            case "aws:ec2/instance:Instance":
                return {
                    id: "i-1234567890abcdef0",
                    state: {
                        ...args.inputs,

                        arn: "arn:aws:ec2:us-west-2:123456789012:instance/i-1234567890abcdef0",
                        instanceState: "running",
                        primaryNetworkInterfaceId: "eni-12345678",
                        privateDns: "ip-10-0-1-17.ec2.internal",
                        publicDns: "ec2-203-0-113-12.compute-1.amazonaws.com",
                        publicIp: "203.0.113.12",
                    },
                };
            default:
                return {
                    id: args.inputs.name + "_id",
                    state: {
                        ...args.inputs,
                    },
                };
        }
    },
    call: function (args: pulumi.runtime.MockCallArgs) {
        switch (args.token) {
            case "aws:ec2/getAmi:getAmi":
                return {
                    architecture: "x86_64",
                    id: "ami-0eb1f3cdeeb8eed2a",
                };
            default:
                return args;
        }
    },
});
