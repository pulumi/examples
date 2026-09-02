import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

export interface DatabaseArgs {
    vpcId: pulumi.Input<string>;
    privateSubnetIds: pulumi.Input<pulumi.Input<string>[]>;
    secretsStore: pulumi.Input<string>;
    engineVersion: pulumi.Input<string>;
    namePrefix: pulumi.Input<string>;
    tags: Record<string, string>;
}

export class Database extends pulumi.ComponentResource {
    public readonly clusterArn: pulumi.Output<string>;
    public readonly secretArn: pulumi.Output<string>;
    public readonly securityGroupId: pulumi.Output<string>;
    public readonly databaseName: pulumi.Output<string>;

    constructor(name: string, args: DatabaseArgs, opts?: pulumi.ComponentResourceOptions) {
        super("serverless-react-postgres:aws:Database", name, {}, opts);
        const parent = { parent: this };

        const databaseName = "appdb";
        const masterUsername = "pgadmin";

        const password = new random.RandomPassword(`${name}-password`, {
            length: 32,
            special: false,
        }, parent);

        const securityGroup = new aws.ec2.SecurityGroup(`${name}-sg`, {
            vpcId: args.vpcId,
            description: "Aurora Serverless v2 PostgreSQL access",
            tags: args.tags,
        }, parent);

        const subnetGroup = new aws.rds.SubnetGroup(`${name}-subnets`, {
            subnetIds: args.privateSubnetIds,
            description: "Private subnets for Aurora Serverless v2 PostgreSQL",
            tags: args.tags,
        }, parent);

        const cluster = new aws.rds.Cluster(`${name}-cluster`, {
            engine: aws.rds.EngineType.AuroraPostgresql,
            engineMode: "provisioned",
            engineVersion: args.engineVersion,
            databaseName: databaseName,
            masterUsername: masterUsername,
            masterPassword: password.result,
            dbSubnetGroupName: subnetGroup.name,
            vpcSecurityGroupIds: [securityGroup.id],
            storageEncrypted: true,
            skipFinalSnapshot: true,
            serverlessv2ScalingConfiguration: {
                minCapacity: 0,
                maxCapacity: 2,
            },
            tags: args.tags,
        }, parent);

        const instance = new aws.rds.ClusterInstance(`${name}-instance`, {
            clusterIdentifier: cluster.id,
            instanceClass: "db.serverless",
            engine: aws.rds.EngineType.AuroraPostgresql,
            engineVersion: cluster.engineVersion,
            dbSubnetGroupName: subnetGroup.name,
            publiclyAccessible: false,
            tags: args.tags,
        }, parent);

        const connectionUrl = pulumi.all([
            password.result,
            cluster.endpoint,
        ]).apply(([pw, host]) =>
            `postgresql://${masterUsername}:${encodeURIComponent(pw)}@${host}:5432/${databaseName}?sslmode=require`,
        );

        const secretName = pulumi.interpolate`${args.secretsStore}/${args.namePrefix}/database-url`;

        const secret = new aws.secretsmanager.Secret(`${name}-secret`, {
            name: secretName,
            description: "Aurora Serverless v2 PostgreSQL connection URL",
            recoveryWindowInDays: 0,
            tags: args.tags,
        }, { ...parent, dependsOn: [instance] });

        const secretVersion = new aws.secretsmanager.SecretVersion(`${name}-secret-version`, {
            secretId: secret.id,
            secretString: connectionUrl.apply((url) => JSON.stringify({ DATABASE_URL: url })),
        }, parent);

        this.clusterArn = cluster.arn;
        this.secretArn = secret.arn;
        this.securityGroupId = securityGroup.id;
        this.databaseName = pulumi.output(databaseName);

        this.registerOutputs({
            clusterArn: this.clusterArn,
            secretArn: this.secretArn,
            securityGroupId: this.securityGroupId,
            databaseName: this.databaseName,
        });
    }
}
