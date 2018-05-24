const cloud = require("@pulumi/cloud-aws");

let service = new cloud.Service("pulumi-nginx", {
    containers: {
        nginx: {
            build: "./app",
            memory: 512,
            ports: [{ port: 80 }],
        },
    },
    replicas: 2,
});

// export just the hostname property of the container frontend
exports.hostname = service.defaultEndpoint.apply(e => `http://${e.hostname}`);
