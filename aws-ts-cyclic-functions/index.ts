// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as awsnative from "@pulumi/aws-native";
import * as resources from "@pulumi/azure-native/resources";

const rgInitialA = new resources.ResourceGroup(
  "a",
  {},
  { ignoreChanges: ["tags"] }
);

const rgB = new resources.ResourceGroup("b", { tags: { a: rgInitialA.name } });
const rgFinalA = new resources.ResourceGroup("a", { tags: { b: rgB.name } });

const s3initialA = new awsnative.s3.Bucket(
  "a",
  {},
  { ignoreChanges: ["tags"] }
);
const s3b = new awsnative.s3.Bucket("b", {
  tags: [{ key: "a", value: s3initialA.bucketName.apply((n) => n ?? "") }],
});
const s3finalA = new awsnative.s3.Bucket("a", {
  tags: [{ key: "b", value: s3b.bucketName.apply((n) => n ?? "") }],
});

export const rgATags = rgFinalA.tags;
export const rgBTags = rgB.tags;
export const s3aTags = s3finalA.tags;
export const s3bTags = s3b.tags;
