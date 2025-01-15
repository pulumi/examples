// Copyright 2016-2025, Pulumi Corporation.  All rights reserved.
import * as command from "@pulumi/command";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as jenkins from "./jenkins";

// Minikube does not implement services of type `LoadBalancer`; require the user to specify if we're
// running on minikube, and if so, create only services of type ClusterIP.
const config = new pulumi.Config();
let metalLB: command.local.Command | undefined = undefined;
let checkMetalLB: command.local.Command | undefined = undefined;
let metalLBConfig: k8s.core.v1.ConfigMap | undefined = undefined;

if (config.require("isMinikube") === "true") {
  if (config.require("enableMetalLB") === "true") {
    // Enable MetalLB in Minikube with wait
    metalLB = new command.local.Command("MetalLB", {
      create: `minikube addons enable metallb && minikube addons list | grep metallb | grep -q enabled`,
      delete: `minikube addons disable metallb`,
    }, {
      deleteBeforeReplace: true,
    });
  }
  checkMetalLB = new command.local.Command("MetalLB", {
    create: `minikube addons list --output json`,
  }, { deleteBeforeReplace: true, dependsOn: metalLB ? [metalLB] : [] });
  pulumi.jsonParse(checkMetalLB.stdout).apply(json => {
    if (json["metallb"]["Status"] !== "enabled") {
      throw new Error("This example requires MetalLB to be enabled in minikube, you can enable it by running `minikube addons enable metallb`");
    }
  });

  metalLBConfig = new k8s.core.v1.ConfigMap("metallbConfig", {
    metadata: {
      namespace: "metallb-system",
      name: "config",
      annotations: {
        "pulumi.com/patchForce": "true",
      },
    },
    data: {
      config: `
          address-pools:
          - name: default
            protocol: layer2
            addresses:
            - 192.168.49.240-192.168.49.250
        `,
    },
  }, { deleteBeforeReplace: true, dependsOn: [checkMetalLB] });
}

const instance = new jenkins.Instance({
  name: pulumi.getStack(),
  credentials: {
    username: config.require("username"),
    password: config.require("password"),
  },
  resources: {
    memory: "512Mi",
    cpu: "100m",
  },
}, { dependsOn: metalLBConfig ? [metalLBConfig] : [] });

export const externalIp = instance.externalIp;
