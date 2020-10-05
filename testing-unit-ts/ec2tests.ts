// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import "mocha";

pulumi.runtime.setMocks({
    newResource: function(type: string, name: string, inputs: any): {id: string, state: any} {
        switch (type) {
            case "aws:ec2/securityGroup:SecurityGroup":
                return {
                    id: "sg-12345678",
                    state: {
                        ...inputs,

                        arn: "arn:aws:ec2:us-west-2:123456789012:security-group/sg-12345678",
                        name: inputs.name || name + "-sg",
                    },
                };
            case "aws:ec2/instance:Instance":
                return {
                    id: "i-1234567890abcdef0",
                    state: {
                        ...inputs,

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
                    id: inputs.name + "_id",
                    state: {
                        ...inputs,
                    },
                };
        }
    },
    call: function(token: string, args: any, provider?: string) {
        switch (token) {
            case "aws:index/getAmi:getAmi":
                return {
                    "architecture": "x86_64",
                    "id": "ami-0eb1f3cdeeb8eed2a",
                };
            default:
                return args;
        }
    },
});

// It's important to import the program _after_ the mocks are defined.
import * as infra from "./index";

describe("Infrastructure", function() {
    const server = infra.server;
    describe("#server", function() {
        // check 1: Instances have a Name tag.
        it("must have a name tag", function(done) {
            pulumi.all([server.urn, server.tags]).apply(([urn, tags]) => {
                if (!tags || !tags["Name"]) {
                    done(new Error(`Missing a name tag on server ${urn}`));
                } else {
                    done();
                }
            });
        });

        // check 2: Instances must not use an inline userData script.
        it("must not use userData (use an AMI instead)", function(done) {
            pulumi.all([server.urn, server.userData]).apply(([urn, userData]) => {
                if (userData) {
                    done(new Error(`Illegal use of userData on server ${urn}`));
                } else {
                    done();
                }
            });
        });
    });

    const group = infra.group;
    describe("#group", function() {
        // check 3: Instances must not have SSH open to the Internet.
        it("must not open port 22 (SSH) to the Internet", function(done) {
            pulumi.all([ group.urn, group.ingress ]).apply(([ urn, ingress ]) => {
                if (ingress.find(rule =>
                    rule.fromPort === 22 && (rule.cidrBlocks || []).find(block => block === "0.0.0.0/0"))) {
                        done(new Error(`Illegal SSH port 22 open to the Internet (CIDR 0.0.0.0/0) on group ${urn}`));
                } else {
                    done();
                }
            });
        });
    });
});
