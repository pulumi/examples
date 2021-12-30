import * as resources from "@pulumi/azure-native/resources";

const rgInitialA = new resources.ResourceGroup(
  "a",
  { resourceGroupName: "cyclic-test-a" },
  { ignoreChanges: ["tags"] }
);

const rgB = new resources.ResourceGroup("b", {
  resourceGroupName: "cyclic-test-b",
  tags: { a: rgInitialA.name },
});

// const rgFinalA = new resources.ResourceGroup(
//   "a",
//   {
//     resourceGroupName: "cyclic-test-a",
//     tags: { b: rgB.name },
//   },
//   {
//     additiveUpdate: true,
//     dependsOn: [rgInitialA, rgB],
//   },
// );
const rgFinalA = rgInitialA.update({
  resourceGroupName: "cyclic-test-a",
  tags: { b: rgB.name },
});

export const rgATags = rgFinalA.tags;
export const rgBTags = rgB.tags;
