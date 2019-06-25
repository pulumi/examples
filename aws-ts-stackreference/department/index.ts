import * as pulumi from "@pulumi/pulumi";

/**
 *   company
 *   └─ department
 *      └─ team
 */

const config = new pulumi.Config();

export const departmentName = config.require("departmentName");
