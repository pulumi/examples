import { readFileSync } from "fs";
export const strVar = "foo";
export const arrVar = ["fizz", "buzz"];
// add readme to stack outputs
export const readme = readFileSync("./Pulumi.README.md");
