import * as pulumi from "@pulumi/pulumi"
import * as aws from "@pulumi/aws"

// Interface for backend args
export interface WebServiceArgs {
  dbHost: pulumi.Output<string>;
  dbName: pulumi.Output<string>;
  dbUser: string;
  dbPassword: pulumi.Output<string>;
  dbPort: string;
  vpcId: pulumi.Output<string>;
  subnetIds: pulumi.Output<string>[];
  securityGroupIds: pulumi.Output<string>[];
}

// Creates DB
export class WebService extends pulumi.ComponentResource {

  constructor(name: string, args: WebServiceArgs, opts?: pulumi.ComponentResourceOptions) {

    super("custom:resource:WebService", name, args, opts)

    // Create ECS cluster to run a container-based service
    const cluster = new aws.ecs.Cluster(`${name}-ecs`, {}, { parent: this })

    // Create load balancer to listen for HTTP traffic
    const alb = new aws.lb.LoadBalancer(`${name}-alb`, {
      securityGroups: args.securityGroupIds,
      subnets: args.subnetIds,
    }, { parent: this })

    const atg = new aws.lb.TargetGroup(`${name}-app-tg`, {
      port: 80,
      protocol: "HTTP",
      targetType: "ip",
      vpcId: args.vpcId,
      healthCheck: {
        healthyThreshold: 2,
        interval: 5,
        timeout: 4,
        protocol: "HTTP",
        matcher: "200-399"
      }
    }, { parent: this })

    const wl = new aws.lb.Listener(`${name}-listener`, {
      loadBalancerArn: alb.arn,
      port: 80,
      defaultActions: [
        {
          type: "forward",
          targetGroupArn: atg.arn
        }
      ]
    }, { parent: this })

    const assumeRolePolicy = {
      'Version': '2008-10-17',
      'Statement': [{
          'Sid': '',
          'Effect': 'Allow',
          'Principal': {
              'Service': 'ecs-tasks.amazonaws.com'
          },
          'Action': 'sts:AssumeRole',
      }]
    };

    const role = new aws.iam.Role(`${name}-task-role`, {
      assumeRolePolicy: JSON.stringify(assumeRolePolicy) 
      }, { parent: this })

    const rpa = new aws.iam.RolePolicyAttachment(`${name}-task-policy`, {
      role: role.name,
      policyArn: "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy",
    }, { parent: this })

    // Spin up a load balanced service running our container image.
    const taskName = `${name}-app-task`
    const containerName = `${name}-app-container`
    const taskDefinition = pulumi.all(args.db_host, args.db_port, args.db_name, args.db_user, args.db_password).apply(

// ...
let connectionString = pulumi.all([sqlServer.name, database.name])
    .apply(([server, db]) => `Server=tcp:${server}.database.windows.net;initial catalog=${db}...`);
    this.registerOutputs({});
  }
}
