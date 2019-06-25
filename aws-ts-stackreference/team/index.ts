import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

/**
 *   company
 *   └─ department
 *      └─ team
 */

const config = new pulumi.Config();

const companyStack = new pulumi.StackReference(config.require("companyStack"));
const departmentStack = new pulumi.StackReference(config.require("departmentStack"));

const combinedTags = {
    /* from company stack    */ company: companyStack.getOutput("companyName"),
    /* from department stack */ department: departmentStack.getOutput("departmentName"),
    /* from team config      */ team: config.require("teamName"),
    "Managed By": "Pulumi",
}

const amiId = aws.getAmi({
    mostRecent: true,
    filters: [
        { name: "owner-id", values: ["099720109477"] }, // Ubuntu
        { name: "name", values: ["ubuntu/images/hvm-ssd/ubuntu-bionic-18.04-amd64-server-*"] },
    ],
}).then(x => x.id);

const instance = new aws.ec2.Instance("tagged", {
    ami: amiId,
    instanceType: "t2.medium",
    tags: combinedTags,
});

export const instanceId = instance.id;
export const instanceTags = instance.tags;
