// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";
import * as pulumi from "@pulumi/pulumi";
import * as postgresql from "@pulumi/postgresql";
import { Schema } from "./PostgreSqlDynamicProvider";
import { table } from "console";

const config = new pulumi.Config();
const sql_admin_name = config.require("sql-admin-name");
const sql_admin_password = config.requireSecret("sql-admin-password");
const sql_user_name = config.require("sql-user-name");
const sql_user_password = config.requireSecret("sql-user-password");
const awsConfig = new pulumi.Config("aws"); 
const availabilityZone = awsConfig.get("region");

const appVpc = new aws.ec2.Vpc("app-vpc", {
    cidrBlock: "172.31.0.0/16",
    enableDnsHostnames: true
});

const appGateway = new aws.ec2.InternetGateway("app-gateway", {
    vpcId: appVpc.id
});

const appRoutetable = new aws.ec2.RouteTable("app-routetable", {
    routes: [
        {
            cidrBlock: "0.0.0.0/0",
            gatewayId: appGateway.id,
        }
    ],
    vpcId: appVpc.id
});

const appRoutetableAssociation = new aws.ec2.MainRouteTableAssociation("app-routetable-association", {
    routeTableId: appRoutetable.id,
    vpcId: appVpc.id
});

const rdsSecurityGroup = new aws.ec2.SecurityGroup("rds-security-group", {
	vpcId: appVpc.id,
	description: "Enables HTTP access",
    ingress: [{
		protocol: 'tcp',
		fromPort: 0,
		toPort: 65535,
		cidrBlocks: ['0.0.0.0/0'],
    }],
    egress: [{
		protocol: '-1',
		fromPort: 0,
		toPort: 0,
		cidrBlocks: ['0.0.0.0/0'],
    }]
});

const firstRdsSubnet = new aws.ec2.Subnet("first-rds-subnet", {
    vpcId: appVpc.id,
    cidrBlock: "172.31.0.0/20",
    availabilityZone: availabilityZone + "a"
});

const secondRdsSubnet = new aws.ec2.Subnet("second-rds-subnet", {
    vpcId: appVpc.id,
    cidrBlock: "172.31.128.0/20",
    availabilityZone: availabilityZone + "b"
});

const rdsSubnetGroup = new aws.rds.SubnetGroup("rds-subnet-group", {
    subnetIds: [firstRdsSubnet.id, secondRdsSubnet.id]
});

const postgresqlRdsServer = new aws.rds.Instance("postgresql-rds-server", {
    engine: "postgres",
    username: sql_admin_name,
    password: sql_admin_password,
    instanceClass: "db.t2.micro",
    allocatedStorage: 20,
    skipFinalSnapshot: true,
    publiclyAccessible: true,
    port: 2000,
    dbSubnetGroupName: rdsSubnetGroup.name,
    vpcSecurityGroupIds: [rdsSecurityGroup.id]
});

const postgresqlProvider = new postgresql.Provider("postgresql-provider", {
        host: postgresqlRdsServer.address,
        port: postgresqlRdsServer.port,
        username: sql_admin_name,
        password: sql_admin_password,
        superuser: false
});

const postgresDatabase = new postgresql.Database("postgresql-database", {
    name: "votes"}, {
    provider: postgresqlProvider
});

const postgresUser = new postgresql.Role("postgres-standard-role", {
    name: sql_user_name,
    password: sql_user_password,
    superuser: false,
    login: true,
    connectionLimit: -1}, {
    provider: postgresqlProvider
});

// The database schema and initial data to be deployed to the database
const creation_script = `
    CREATE SCHEMA voting_app;
    CREATE TABLE voting_app.choice(
        choice_id SERIAL PRIMARY KEY,
        text VARCHAR(255) NOT NULL,
        vote_count INTEGER NOT NULL
    );
    GRANT USAGE ON SCHEMA voting_app TO ${sql_user_name};
    GRANT SELECT, UPDATE ON ALL TABLES IN SCHEMA voting_app TO ${sql_user_name};
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Tabs', 0);
    INSERT INTO voting_app.choice (text, vote_count) VALUES('Spaces', 0);
`;

// The SQL commands the database performs when deleting the schema
const deletion_script = "DROP SCHEMA IF EXISTS voting_app CASCADE";

// Creating our dynamic resource to deploy the schema during `pulumi up`. The arguments
// are passed in as a SchemaInputs object
const postgresqlVotesTable = new Schema("postgresql-votes-schema", {
    creatorName: sql_admin_name,
    creatorPassword: sql_admin_password,
    serverAddress: postgresqlRdsServer.address,
    databaseName: postgresDatabase.name,
    creationScript: creation_script,
    deletionScript: deletion_script,
    postgresUserName: postgresUser.name
});

const serversideListener = new awsx.elasticloadbalancingv2.NetworkListener("server-side-listener", { port: 5000 });
const serversideService = new awsx.ecs.FargateService("server-side-service", {
    taskDefinitionArgs: {
        containers: {
            serversideService: {
                image: awsx.ecs.Image.fromPath("server-side-service", "./serverside"),
                memory: 512,
                portMappings: [serversideListener],
                environment: [
                    { name: "USER_NAME", value: sql_user_name },
                    { name: "USER_PASSWORD", value: sql_user_password },
                    { name: "RDS_ADDRESS", value: postgresqlRdsServer.address },
                    { name: "RDS_PORT", value: String(2000) },
                    { name: "DATABASE_NAME", value: postgresDatabase.name },
                ],
            },
        },
    },
});

const clientsideListener = new awsx.elasticloadbalancingv2.NetworkListener("client-side-listener", { port: 3000 });
const clientsideService = new awsx.ecs.FargateService("client-side-service", {
    taskDefinitionArgs: {
        containers: {
            clientsideService: {
                image: awsx.ecs.Image.fromPath("client-side-service", "./clientside"),
                memory: 512,
                portMappings: [clientsideListener],
                environment: [
                    { name: "SERVER_HOSTNAME", value: serversideListener.endpoint.hostname },
                ],
            },
        },
    },
});

export let URL = clientsideListener.endpoint.hostname;
