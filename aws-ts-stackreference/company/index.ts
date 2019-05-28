import * as pulumi from "@pulumi/pulumi";

/**
 *   company
 *   └─ department
 *      └─ team
 */

const config = new pulumi.Config();

export const companyName = config.require("companyName");
