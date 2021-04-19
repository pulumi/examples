// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Arguments for a KEDA deployment.
export interface KedaServiceArgs {
    resourceGroup: azure.core.ResourceGroup;
    k8sProvider: k8s.Provider;
}

// A component to deploy shared parts of KEDA (container registry, kedacore/keda-edge Helm chart)
export class KedaService extends pulumi.ComponentResource {
    public registry: azure.containerservice.Registry;
    public k8sProvider: k8s.Provider;
    public registrySecretName: pulumi.Output<string>;

    constructor(name: string,
                args: KedaServiceArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:keda:KedaEdge", name, args, opts);

        // Add a container registry to store custom images of Azure Functions
        const registry = new azure.containerservice.Registry("registry", {
            resourceGroupName: args.resourceGroup.name,
            adminEnabled: true,
            sku: "Premium",
        }, { parent: this });

        const dockercfg = pulumi.all([registry.loginServer, registry.adminUsername, registry.adminPassword])
            .apply(([server, username, password]) => {
                const r: any = {};
                r[server] = {
                    email: "notneeded@notneeded.com",
                    username,
                    password,
                };
                return r;
            });

        // Storage the docker registry credentials as a secret
        const secretRegistry = new k8s.core.v1.Secret("registry-secret", {
            data: {
                ".dockercfg": dockercfg.apply(c => Buffer.from(JSON.stringify(c)).toString("base64")),
            },
            type: "kubernetes.io/dockercfg",
        },
        { provider: args.k8sProvider, parent: this });

        // Deploy a KEDA Edge Helm chart
        const keda = new k8s.helm.v2.Chart("keda-edge", {
            chart: "keda",
            fetchOpts: {
                repo: "https://kedacore.github.io/charts",
            },
            version: "2.2.1",
            values: {
                logLevel: "debug",
            },
        }, { providers: { kubernetes: args.k8sProvider }, parent: this });

        this.k8sProvider = args.k8sProvider;
        this.registry = registry;
        this.registrySecretName = secretRegistry.metadata.name;
        this.registerOutputs();
    }
}

// Arguments for an Azure Function App that processes messages from a given storage queue.
export interface KedaStorageQueueHandlerArgs {
    resourceGroup: azure.core.ResourceGroup;
    service: KedaService;
    storageAccount: azure.storage.Account;
    queue: azure.storage.Queue;
    path: pulumi.Input<string>;
}

// A KEDA-deployed Azure Function App that processes messages from a given storage queue.
export class KedaStorageQueueHandler extends pulumi.ComponentResource {
    constructor(name: string,
                args: KedaStorageQueueHandlerArgs,
                opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:keda:KedaStorageQueueHandler", name, args, opts);

        const registry = args.service.registry;

        // Deploy the docker image of the Function App
        const dockerImage = new docker.Image("image", {
            imageName: pulumi.interpolate`${registry.loginServer}/${args.queue.name}:v1.0.0`,
            build: {
                context: args.path,
            },
            registry: {
                server: registry.loginServer,
                username: registry.adminUsername,
                password: registry.adminPassword,
            },
        }, { parent: this });

        // Put the storage account connection string into a secret
        const secretQueue = new k8s.core.v1.Secret("queue-secret", {
            data: {
                queueConnectionString:
                    args.storageAccount.primaryConnectionString.apply(c => Buffer.from(c).toString("base64")),
            },
        }, { provider: args.service.k8sProvider, parent: this });

        // Deploy the Function App from the image
        const appLabels = { app: name };
        const deployment = new k8s.apps.v1.Deployment(name, {
            apiVersion: "apps/v1",
            kind: "Deployment",
            metadata: {
                labels: appLabels,
            },
            spec: {
                selector: { matchLabels: appLabels },
                template: {
                    metadata: {
                        labels: appLabels,
                    },
                    spec: {
                        containers: [{
                            name,
                            image: dockerImage.imageName,
                            env: [{ name: "queuename", value: args.queue.name }],
                            envFrom: [{ secretRef: {name: secretQueue.metadata.name } }],
                        }],
                        imagePullSecrets: [{ name: args.service.registrySecretName }],
                    },
                },
            },
        }, { provider: args.service.k8sProvider, parent: this });

        // Deploy a custom resource Scale Object and point it to the queue
        const scaledObject = new k8s.apiextensions.CustomResource("scaleobject", {
            apiVersion: "keda.k8s.io/v1alpha1",
            kind: "ScaledObject",
            metadata: {
                labels: { deploymentName: name },
            },
            spec: {
                scaleTargetRef: { deploymentName: name },
                triggers: [{
                    type: "azure-queue",
                    metadata: {
                        type: "queueTrigger",
                        connection: "queueConnectionString",
                        queueName: args.queue.name,
                        name: "myQueueItem",
                    },
                }],
            },
        }, { provider: args.service.k8sProvider, parent: this });

        this.registerOutputs();
    }
}
