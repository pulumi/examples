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
import { PolicyPack } from "@pulumi/policy";

import * as compute from "./compute";

const policies = new PolicyPack("awsSecRules", {
    policies: [
        compute.requireApprovedAmisById("approved-amis-by-id", [
            "amzn-ami-2018.03.u-amazon-ecs-optimized",
        ]),
        compute.requireHealthChecksOnAsgElb("autoscaling-group-elb-healthcheck-required"),
        compute.requireInstanceTenancy(
            "dedicated-instance-tenancy",
            "DEDICATED",
            /*amis:*/ ["amzn-ami-2018.03.u-amazon-ecs-optimized"],
            /*host IDs:*/ [],
        ),
        compute.requireInstanceType("desired-instance-type", /*instanceTypes:*/ []),
        compute.requireEbsOptimization("ebs-optimized-instance"),
        compute.requireDetailedMonitoring("ec2-instance-detailed-monitoring-enabled"),
        compute.requireEbsVolumesOnEc2Instances("ec2-volume-inuse-check"),
        compute.requireEbsEncryption("encrypted-volumes"),
        compute.requireElbLogging("elb-logging-enabled"),
    ],
});
