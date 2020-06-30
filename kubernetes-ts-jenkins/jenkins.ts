// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as input from "@pulumi/kubernetes/types/input";
import * as pulumi from "@pulumi/pulumi";
import { externalIp } from ".";

function createDeploymentArgs(args: JenkinsArgs): input.apps.v1.Deployment {
    const image = args.image || {
        registry: "docker.io",
        repository: "bitnami/jenkins",
        tag: "2.121.2",
        pullPolicy: "IfNotPresent",
    };

    // This object is a projection of the Kubernetes object model into the Pulumi object model.
    // Its structure is derived from the Deployment object in the Kubernetes API.
    return {
        metadata: {
            name: args.name,
        },
        spec: {
            replicas: 1,
            selector: {
                matchLabels:  {
                    app: args.name,
                },
            },
            template: {
                metadata: {
                    labels: {
                        app: args.name,
                    },
                },
                spec: {
                    volumes: [
                        {
                            name: "jenkins-data",
                            persistentVolumeClaim: {
                                claimName: args.name,
                            },
                        },
                    ],
                    containers: [
                        {
                            name: args.name,
                            image: `${image.registry}/${image.repository}:${image.tag}`,
                            imagePullPolicy: image.pullPolicy,
                            env: [
                                {
                                    name: "JENKINS_USERNAME",
                                    value: args.credentials.username,
                                },
                                {
                                    name: "JENKINS_PASSWORD",
                                    valueFrom: {
                                        secretKeyRef: {
                                            name: args.name,
                                            key: "jenkins-password",
                                        },
                                    },
                                },
                            ],
                            ports: [
                                {
                                    name: "http",
                                    containerPort: 8080,
                                },
                                {
                                    name: "https",
                                    containerPort: 8443,
                                },
                            ],
                            livenessProbe: {
                                httpGet: {
                                    path: "/login",
                                    port: "http",
                                },
                                initialDelaySeconds: 180,
                                timeoutSeconds: 5,
                                failureThreshold: 6,
                            },
                            readinessProbe: {
                                httpGet: {
                                    path: "/login",
                                    port: "http",
                                },
                                initialDelaySeconds: 90,
                                timeoutSeconds: 5,
                                periodSeconds: 6,
                            },
                            volumeMounts: [
                                {
                                    name: "jenkins-data",
                                    mountPath: "/bitnami/jenkins",
                                },
                            ],
                            resources: {
                                requests: {
                                    memory: args.resources.memory,
                                    cpu: args.resources.cpu,
                                },
                            },
                        }, // container
                    ], // containers
                }, // spec
            }, // template
        }, // spec
    }; // deployment
}

/**
 * ComponentResource for a Jenkins instance running in a Kubernetes cluster.
 */
export class Instance extends pulumi.ComponentResource {

    externalIp: pulumi.Output<string>;

    constructor(args: JenkinsArgs, opts?: pulumi.ResourceOptions) {
        super("jenkins:jenkins:Instance", args.name, args, opts);

        // The Secret will contain the root password for this instance.
        const secret = new k8s.core.v1.Secret(`${args.name}-secret`, {
            metadata: {
                name: args.name,
            },
            type: "Opaque",
            data: {
                "jenkins-password": Buffer.from(args.credentials.password).toString("base64"),
            },
        }, { parent: this });

        // The PVC provides persistent storage for Jenkins state.
        const pvc = new k8s.core.v1.PersistentVolumeClaim(`${args.name}-pvc`, {
            metadata: {
                name: args.name,
            },
            spec: {
                accessModes: ["ReadWriteOnce"],
                resources: {
                    requests: {
                        storage: "8Gi",
                    },
                },
            },
        }, { parent: this });

        // The Deployment describes the desired state for our Jenkins setup.
        const deploymentArgs = createDeploymentArgs(args);
        const deployment = new k8s.apps.v1.Deployment(`${args.name}-deploy`, deploymentArgs, { parent: this });

        // The Service exposes Jenkins to the external internet by providing load-balanced ingress for HTTP and HTTPS.
        const service = new k8s.core.v1.Service(`${args.name}-service`, {
            metadata: {
                name: args.name,
            },
            spec: {
                type: "LoadBalancer",
                ports: [
                    {
                        name: "http",
                        port: 80,
                        targetPort: "http",
                    },
                    {
                        name: "https",
                        port: 443,
                        targetPort: "https",
                    },
                ],
                selector: {
                    app: args.name,
                },
            },
        }, { parent: this });
        this.externalIp = service.status.loadBalancer.ingress[0].ip;
        this.registerOutputs({externalIp: externalIp});
    }
}

/**
 * Arguments for Jenkins instances.
 */
export interface JenkinsArgs {
    /**
     * The name of the instance. All Kubernetes objects will be tagged with this name
     * in their metadata.
     */
    readonly name: string;

    /**
     * Credentials for accessing the created Jenkins instance.
     */
    readonly credentials: JenkinsCredentials;

    /**
     * The Docker image to use to launch this instance of Jenkins.
     */
    readonly image?: JenkinsImage;

    /**
     * Resource requests for this instance.
     */
    readonly resources: JenkinsResources;

    /**
     * Storage class to use for the persistent volume claim.
     */
    readonly storageClass?: string;
}

/**
 * Credentials to access the newly-created Jenkins instance.
 */
export interface JenkinsCredentials {
    /**
     * Username for the root user.
     */
    readonly username: string;

    /**
     * Password for the root user.
     */
    readonly password: string;
}

/**
 * The image to use when launching Jenkins.
 */
export interface JenkinsImage {
    /**
     * The registry from which to draw Docker images.
     */
    readonly registry: string;

    /**
     * The Docker repository name for the target image.
     */
    readonly repository: string;

    /**
     * The Docker image tag for the target image.
     */
    readonly tag: string;

    /**
     * Pull policy for this image.
     */
    readonly pullPolicy: string;
}

/**
 * Resource requests for this Jenkins instance.
 */
export interface JenkinsResources {
    /**
     * Requested memory.
     */
    readonly memory: string;

    /**
     * Requested CPU.
     */
    readonly cpu: string;
}
