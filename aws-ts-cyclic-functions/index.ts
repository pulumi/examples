// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as resources from "@pulumi/azure-native/resources";

const initialA = new resources.ResourceGroup(
  "a",
  {},
  { ignoreChanges: ["tags"] }
);

const b = new resources.ResourceGroup("b", { tags: { a: initialA.name } });
const finalA = new resources.ResourceGroup("a", { tags: { b: b.name } });

export const aTags = finalA.tags;
export const bTags = b.tags;
