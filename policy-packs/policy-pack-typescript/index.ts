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
import { PolicyPack, validateTypedResource } from "@pulumi/policy";

new PolicyPack("policy-pack-typescript", {
    policies: [{
        name: "s3-no-public-read",
        description: "Prohibits setting the publicRead or publicReadWrite permission on AWS S3 buckets.",
        enforcementLevel: "mandatory",
        validateResource: validateTypedResource(aws.s3.Bucket.isInstance, (bucket, args, reportViolation) => {
            if (bucket.acl === "public-read" || bucket.acl === "public-read-write") {
                reportViolation(
                    "You cannot set public-read or public-read-write on an S3 bucket. " +
                    "Read more about ACLs here: https://docs.aws.amazon.com/AmazonS3/latest/dev/acl-overview.html");
            }
        }),
    }],
});
