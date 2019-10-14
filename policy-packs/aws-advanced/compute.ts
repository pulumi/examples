// Copyright 2016-2019, Pulumi Corporation.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import * as aws from "@pulumi/aws";
import { Policy, typedRule } from "@pulumi/policy";
import * as assert from "assert";

export function requireApprovedAmisById(
    name: string,
    approvedAmis: string | Iterable<string>,
): Policy {
    const amis = toStringSet(approvedAmis);

    return {
        name: name,
        description: "Instances should use approved AMIs",
        enforcementLevel: "mandatory",
        rules: [
            typedRule(
                aws.ec2.Instance.isInstance,
                it => amis && assert.ok(amis.has(it.ami), "foo"),
            ),
            typedRule(
                aws.ec2.LaunchConfiguration.isInstance,
                it => amis && assert.ok(amis.has(it.imageId)),
            ),
            typedRule(
                aws.ec2.LaunchTemplate.isInstance,
                it => amis && assert.ok(it.imageId === undefined || amis.has(it.imageId)),
            ),
        ],
    };
}

// TODO: approved-amis-by-tag
// https://docs.aws.amazon.com/config/latest/developerguide/approved-amis-by-tag.html

export function requireHealthChecksOnAsgElb(name: string): Policy {
    return {
        name: name,
        description:
            "Auto Scaling groups that are associated with a load balancer should use Elastic " +
            "Load Balancing health checks",
        enforcementLevel: "mandatory",
        rules: typedRule(aws.autoscaling.Group.isInstance, it => {
            const classicLbAttached = it.loadBalancers.length > 0;
            const albAttached = it.targetGroupArns.length > 0;
            if (classicLbAttached || albAttached) {
                assert.strictEqual("ELB", it.healthCheckType);
            }
        }),
    };
}

export function requireInstanceTenancy(
    name: string,
    tenancy: "DEDICATED" | "HOST" | "DEFAULT",
    imageIds?: string | Iterable<string>,
    hostIds?: string | Iterable<string>,
): Policy {
    const images = toStringSet(imageIds);
    const hosts = toStringSet(hostIds);

    return {
        name: name,
        description: `Instances with AMIs ${setToString(images)} or host IDs ${setToString(
            hosts,
        )} should use tenancy '${tenancy}'`,
        enforcementLevel: "mandatory",
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => {
                if (hosts !== undefined && hosts.has(it.hostId)) {
                    assert.strictEqual(it.tenancy, tenancy);
                } else if (images !== undefined && images.has(it.ami)) {
                    assert.strictEqual(it.tenancy, tenancy);
                }
            }),
            typedRule(aws.ec2.LaunchConfiguration.isInstance, it => {
                if (images !== undefined && images.has(it.imageId)) {
                    assert.strictEqual(it.placementTenancy, tenancy);
                }
            }),
        ],
    };
}

export function requireInstanceType(
    name: string,
    instanceTypes: aws.ec2.InstanceType | Iterable<aws.ec2.InstanceType>,
): Policy {
    const types = toStringSet(instanceTypes);

    return {
        name: name,
        description: "EC2 instances should use approved instance types.",
        enforcementLevel: "mandatory",
        rules: [
            typedRule(aws.ec2.Instance.isInstance, it => assert.ok(types.has(it.instanceType))),
            typedRule(aws.ec2.LaunchConfiguration.isInstance, it =>
                assert.ok(types.has(it.instanceType)),
            ),
            typedRule(aws.ec2.LaunchTemplate.isInstance, it =>
                assert.ok(it.instanceType !== undefined && types.has(it.instanceType)),
            ),
        ],
    };
}

export function requireEbsOptimization(name: string): Policy {
    // TODO: Enable optimization only for EC2 instances that can be optimized.
    return {
        name: name,
        description: "EBS optimization should be enabled for all EC2 instances",
        enforcementLevel: "mandatory",
        rules: typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it.ebsOptimized === true)),
    };
}

export function requireDetailedMonitoring(name: string): Policy {
    return {
        name: name,
        description: "Detailed monitoring should be enabled for all EC2 instances",
        enforcementLevel: "mandatory",
        rules: typedRule(aws.ec2.Instance.isInstance, it => assert.ok(it.monitoring === true)),
    };
}

// TODO: ec2-instance-managed-by-systems-manager
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-instance-managed-by-ssm.html

// TODO: ec2-instances-in-vpc
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-instances-in-vpc.html

// TODO: ec2-managedinstance-applications-blacklisted
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-applications-blacklisted.html

// TODO: ec2-managedinstance-applications-required
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-association-compliance-status-check.html

// TODO: ec2-managedinstance-association-compliance-status-check
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-association-compliance-status-check.html

// TODO: ec2-managedinstance-inventory-blacklisted
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-inventory-blacklisted.html

// TODO: ec2-managedinstance-patch-compliance-status-check
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-patch-compliance-status-check.html

// TODO: ec2-managedinstance-platform-check
// https://docs.aws.amazon.com/config/latest/developerguide/ec2-managedinstance-platform-check.html

export function requireEbsVolumesOnEc2Instances(name: string): Policy {
    // TODO: Check if EBS volumes are marked for deletion.
    return {
        name: name,
        description: "EBS volumes should be attached to all EC2 instances",
        enforcementLevel: "mandatory",
        rules: typedRule(aws.ec2.Instance.isInstance, it =>
            assert.ok(it.ebsBlockDevices === undefined || it.ebsBlockDevices.length > 0),
        ),
    };
}

// TODO: eip-attached
// https://docs.aws.amazon.com/config/latest/developerguide/eip-attached.html

export function requireEbsEncryption(name: string, kmsKeyId?: string): Policy {
    return {
        name: name,
        description: "EBS volumes should be encrypted",
        enforcementLevel: "mandatory",
        rules: typedRule(aws.ebs.Volume.isInstance, it => {
            assert.ok(it.encrypted);
            if (kmsKeyId !== undefined) {
                assert.strictEqual(it.kmsKeyId, kmsKeyId);
            }
        }),
    };
}

// TODO: elb-acm-certificate-required
// https://docs.aws.amazon.com/config/latest/developerguide/elb-acm-certificate-required.html

// TODO: elb-custom-security-policy-ssl-check
// https://docs.aws.amazon.com/config/latest/developerguide/elb-custom-security-policy-ssl-check.html

export function requireElbLogging(name: string, bucketName?: string): Policy {
    const assertElbLogs = (lb: {
        accessLogs?: {
            bucket: string;
            bucketPrefix?: string;
            enabled?: boolean;
            interval?: number;
        };
    }) => {
        assert.ok(lb.accessLogs !== undefined && lb.accessLogs.enabled === true);
        assert.ok(
            bucketName !== undefined &&
                lb.accessLogs !== undefined &&
                bucketName === lb.accessLogs.bucket,
        );
    };

    return {
        name: name,
        description:
            "All Application Load Balancers and the Classic Load Balancers should have " +
            "logging enabled.",
        enforcementLevel: "mandatory",
        rules: [
            typedRule(aws.elasticloadbalancing.LoadBalancer.isInstance, assertElbLogs),
            typedRule(aws.elasticloadbalancingv2.LoadBalancer.isInstance, assertElbLogs),
        ],
    };
}

// TODO: elb-predefined-security-policy-ssl-check
// https://docs.aws.amazon.com/config/latest/developerguide/elb-predefined-security-policy-ssl-check.html

// TODO: lambda-function-settings-check
// https://docs.aws.amazon.com/config/latest/developerguide/lambda-function-settings-check.html

// TODO: lambda-function-public-access-prohibited
// https://docs.aws.amazon.com/config/latest/developerguide/lambda-function-public-access-prohibited.html

// TODO: restricted-common-ports
// https://docs.aws.amazon.com/config/latest/developerguide/restricted-common-ports.html

// TODO: restricted-ssh
// https://docs.aws.amazon.com/config/latest/developerguide/restricted-ssh.html

function toStringSet(ss: string | Iterable<string>): Set<string>;
function toStringSet(ss?: string | Iterable<string>): Set<string> | undefined;
function toStringSet(ss: any): Set<string> | undefined {
    return ss === undefined ? undefined : typeof ss === "string" ? new Set([ss]) : new Set(ss);
}

function setToString(ss?: Set<string>): string {
    return `{${[...(ss || [])].join(",")}}`;
}
