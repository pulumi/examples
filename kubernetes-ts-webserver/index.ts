// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

import * as kubernetes from "@pulumi/kubernetes";

// Create an nginx pod
let nginxcontainer = new kubernetes.Pod("nginx", {
    metadata: {
        name: "nginx",
        labels: {
            app: "nginx",
        },
    },
    spec: {
        containers: [{
            image: "nginx:1.7.9",
            name: "nginx",
            ports: [{
                containerPort: 80,
            }],
        }],
    },
});

// Create an nginxvolume
let nginxvolume = new kubernetes.PersistentVolume("redis", {
    metadata: {
        name: "nginxvolume"
    },
    specs: [{
        capacity: {
            storage: "10Gi",
        },
        accessModes: ["ReadWriteMany"],
        persistentVolumeSource: {
            gcePersistentDisk: {
                pdName: "test-123",
            },
        },
    }],
});

// create a redis pod
let redispod = new kubernetes.Pod("redis", {
    metadata: {
        name: "redis",
    },
    spec: {
        containers: [{
            name: "redis",
            image: "redis",
            volumeMounts: [{
                name: "redis-persistent-storage",
                mountPath: "/data/redis",
            }]
        }],
        volumes: [{
            name: "redis-persistent-storage",
            emptyDir: {
                medium: "",
            },
        }],
    },
});
