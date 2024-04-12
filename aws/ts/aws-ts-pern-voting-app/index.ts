// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as postgresql from "@pulumi/postgresql";
import * as pulumi from "@pulumi/pulumi";
import { table } from "console";
import { Schema } from "./PostgreSqlDynamicProvider";

const config = new pulumi.Config();
const sqlAdminName = config.require("sql-admin-name");
const sqlAdminPassword = config.requireSecret("sql-admin-password");
const sqlUserName = config.require("sql-user-name");
const sqlUserPassword = config.requireSecret("sql-user-password");
const availabilityZone = aws.config.region;

const appVpc = new aws.ec2.Vpc("app-vpc", {
    cidrBlock: "172.31.0.0/16",
    enableDnsHostnames: true,
});

const appGateway = new aws.ec2.InternetGateway("app-gateway", {
    vpcId: appVpc.id,
});

const appRoutetable = new aws.ec2.RouteTable("app-routetable", {
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: appGateway.id,
        },
    ],
    vpcId: appVpc.id,
});

const appRoutetableAssociation = new aws.ec2.MainRouteTableAssociation("app-routetable-association", {
    routeTableId: appRoutetable.id,
    vpcId: appVpc.id,
});

const rdsSecurityGroup = new aws.ec2.SecurityGroup("rds-security-group", {
    vpcId: appVpc.id,
    description: "Enables HTTP access",
    ingress: [{
        protocol: "tcp",
        fromPort: 0,
        toPort: 65535,
        cidrBlocks: ["0.0.0.0/0"],
    }],
    egress: [{
        protocol: "-1",
        fromPort: 0,
        toPort: 0,
        cidrBlocks: ["0.0.0.0/0"],
    }],
});

const firstRdsSubnet = new aws.ec2.Subnet("first-rds-subnet", {
    vpcId: appVpc.id,
    cidrBlock: "172.31.0.0/20",
    availabilityZone: availabilityZone + "a",
});

const secondRdsSubnet = new aws.ec2.Subnet("second-rds-subnet", {
    vpcId: appVpc.id,
    cidrBlock: "172.31.128.0/20",
    availabilityZone: availabilityZone + "b",
});

const rdsSubnetGroup = new aws.rds.SubnetGroup("rds-subnet-group", {
    subnetIds: [firstRdsSubnet.id, secondRdsSubnet.id],
});

const postgresqlRdsServer = new aws.rds.Instance("postgresql-rds-server", {
    engine: "postgres",
    username: sqlAdminName,
    password: sqlAdminPassword,
    instanceClass: "db.t2.micro",
    allocatedStorage: 20,
    skipFinalSnapshot: true,
    publiclyAccessible: true,
    port: 2000,
    dbSubnetGroupName: rdsSubnetGroup.name,
    vpcSecurityGroupIds: [rdsSecurityGroup.id],
});

const postgresqlProvider = new postgresql.Provider("postgresql-provider", {
        host: postgresqlRdsServer.address,
        port: postgresqlRdsServer.port,
        username: sqlAdminName,
        password: sqlAdminPassword,
        superuser: false,
});

const postgresDatabase = new postgresql.Database("postgresql-database", {
    name: "votes"}, {
    provider: postgresqlProvider,
});

const postgresUser = new postgresql.Role("postgres-standard-role", {
    name: sqlUserName,
    password: sqlUserPassword,
    superuser: false,
    login: true,
    connectionLimit: -1}, {
    provider: postgresqlProvider,
});

// The database schema and initial data to be deployed to the database
const creationScript = `
    CREATE SCHEMA voting_app;
    CREATE TABLE voting_app.choice(
        choice_id SERIAL PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        vote_count INTEGER NOT NULL
    );
    GRANT USAGE ON SCHEMA voting_app TO ${sqlUserName};
    GRANT SELECT, UPDATE ON ALL TABLES IN SCHEMA voting_app TO ${sqlUserName};
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Tabs', 0);
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Spaces', 0);
`;

// The SQL commands the database performs when deleting the schema
const deletionScript = "DROP SCHEMA IF EXISTS voting_app CASCADE";

// Creating our dynamic resource to deploy the schema during `pulumi up`. The arguments
// are passed in as a SchemaInputs object
const postgresqlVotesTable = new Schema("postgresql-votes-schema", {
    creatorName: sqlAdminName,
    creatorPassword: sqlAdminPassword,
    serverAddress: postgresqlRdsServer.address,
    databaseName: postgresDatabase.name,
    creationScript: creationScript,
    deletionScript: deletionScript,
    postgresUserName: postgresUser.name,
});

const repo = new awsx.ecr.Repository("repo", {});

const loadbalancer = new awsx.lb.ApplicationLoadBalancer("loadbalancer", {});

const serverImage = new awsx.ecr.Image("server-side-service", { repositoryUrl: repo.repository.repositoryUrl, context: "./serverside" });
const serversideService = new awsx.ecs.FargateService("server-side-service", {
    taskDefinitionArgs: {
        container: {
                name: "serversideService",
                image: serverImage.imageUri,
                memory: 512,
                portMappings: [{containerPort: 5000, targetGroup: loadbalancer.defaultTargetGroup}],
                environment: [
                    { name: "USER_NAME", value: sqlUserName },
                    { name: "USER_PASSWORD", value: sqlUserPassword },
                    { name: "RDS_ADDRESS", value: postgresqlRdsServer.address },
                    { name: "RDS_PORT", value: String(2000) },
                    { name: "DATABASE_NAME", value: postgresDatabase.name },
                ],
        },
    },
});

const clientImage = new awsx.ecr.Image("client-side-service", { repositoryUrl: repo.repository.repositoryUrl, context: "./clientside" });
const clientLB = new awsx.lb.ApplicationLoadBalancer("client-loadbalancer", {});
const clientsideService = new awsx.ecs.FargateService("client-side-service", {
    taskDefinitionArgs: {
        container: {
                name: "clientsideService",
                image: clientImage.imageUri,
                memory: 512,
                portMappings: [{containerPort: 3000, targetGroup: clientLB.defaultTargetGroup}],
                environment: [
                    { name: "SERVER_HOSTNAME", value: loadbalancer.loadBalancer.dnsName },
                ],
        },
    },
});

export let URL = clientLB.loadBalancer.dnsName;
