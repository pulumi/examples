import * as awsx from "@pulumi/aws-infra";

// Create an elastic network listener to listen for requests and route them to the container.
// See https://docs.aws.amazon.com/elasticloadbalancing/latest/network/introduction.html
// for more details.
let listener = new awsx.elasticloadbalancingv2.NetworkListener("nginx", { port: 80 });

// Define the service to run.  We pass in the listener to hook up the network load balancer
// to the containers the service will launch.
let service = new awsx.ecs.FargateService("nginx", {
    desiredCount: 2,
    taskDefinitionArgs: {
        containers: {
            nginx: {
                image: awsx.ecs.Image.fromPath("./app"),
                memory: 512,
                portMappings: [listener],
            },
        },
    },
});

// export just the hostname property of the container frontend
export const hostname = listener.endpoint().apply(e => `http://${e.hostname}`);
