import * as awsx from "@pulumi/awsx";
import { Config, getStack, StackReference } from "@pulumi/pulumi";
import {Application} from "./application";

const config = new Config();

const networkingStack = new StackReference(config.require("networkingStack"));
const databaseStack = new StackReference(config.require("databaseStack"));

const baseTags = {
    Project: "Pulumi Demo",
    PulumiStack: getStack(),
};

const app = new Application("app", {
    description: `${baseTags.Project} Application`,
    baseTags: baseTags,

    vpcId: networkingStack.getOutput("appVpcId"),

    // ALB in public subnets
    albSubnetIds:  networkingStack.getOutput("appVpcPublicSubnetIds"),

    // App resources in private subnets
    appSubnetIds:  networkingStack.getOutput("appVpcPrivateSubnetIds"),

    appImage: awsx.ecs.Image.fromPath("app", "./src/backend"),
    appPort: 80,

    dbName: databaseStack.getOutput("dbName"),
    dbUsername: databaseStack.getOutput("dbUsername"),
    dbPassword: databaseStack.getOutput("dbPassword"),
    dbPort: databaseStack.getOutput("dbPort"),
    dbHost: databaseStack.getOutput("dbAddress"),
});

export const albAddress = app.albAddress();
