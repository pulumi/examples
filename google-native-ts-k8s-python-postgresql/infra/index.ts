// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { readFileSync } from "fs";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as cluster from "./cluster";
import * as config from "./config";
import * as db from "./db";
import * as iam from "./iam";
import { dockerRegistry } from "./artifact-registry";
import { execSync } from "child_process";

const gitHash = execSync("git rev-parse --short HEAD").toString().trim();

const projectVersion = readFileSync("../VERSION.txt", "utf8").trim();

// We build and push the image to the GCP project's Artifact Registry.
// Make sure docker is configured to use docker registry by running
// > gcloud auth configure-docker
// before running pulumi up
const appImageName = pulumi.interpolate`us-docker.pkg.dev/${config.project}/${config.artifactRegistryDockerRepositoryId}/app:${projectVersion}-${gitHash}`;
const appImage = new docker.Image(
  "app",
  {
    imageName: appImageName,
    build: {
      context: "../app",
    },
  },
  { dependsOn: [dockerRegistry] }
);

// Create a k8s service account that binds our GCP service account
const kubernetesServiceAccount = new k8s.core.v1.ServiceAccount(
  "app",
  {
    metadata: {
      name: config.appServiceAccountName,
      annotations: {
        "iam.gke.io/gcp-service-account": iam.serviceAccount.email,
      },
    },
  },
  { provider: cluster.provider }
);
// Define the containers
const appContainer = {
  name: "app",
  image: appImage.imageName,
  imagePullPolicy: "IfNotPresent",
  env: [
    { name: "LOG_LEVEL", value: "INFO" },
    { name: "APP_PORT", value: config.appPort.toString() },
    { name: "APP_HOST", value: "0.0.0.0" },
    { name: "DB_HOST", value: "localhost" },
    { name: "DB_PORT", value: "5432" },
    { name: "DB_USERNAME", value: db.user.name },
    { name: "DB_DATABASE_NAME", value: db.db.name },
  ],
  ports: [{ containerPort: config.appPort }],
  livenessProbe: {
    initialDelaySeconds: 15,
    periodSeconds: 10,
    httpGet: {
      path: "/health",
      port: config.appPort,
    },
  },
  resources: {
    requests: {
      cpu: "250m",
      memory: "512Mi",
    },
  },
};
const dbInstance = pulumi.interpolate`${config.project}:${config.region}:${db.instance.name}`;
export const SQLProxyContainer = {
  name: "cloudsql-proxy",
  image: "gcr.io/cloudsql-docker/gce-proxy",
  command: [
    "/cloud_sql_proxy",
    pulumi.interpolate`-instances=${dbInstance}=tcp:5432`,
    "-enable_iam_login",
  ],
  imagePullPolicy: "IfNotPresent",
  resources: {
    requests: {
      cpu: "250m",
      memory: "512Mi",
    },
  },
};
// Deploy the app container as a Kubernetes load balanced service.
const appLabels = { app: "app" };
const appDeployment = new k8s.apps.v1.Deployment(
  "app-deployment",
  {
    spec: {
      selector: { matchLabels: appLabels },
      replicas: 1,
      template: {
        metadata: { labels: appLabels },
        spec: {
          containers: [appContainer, SQLProxyContainer],
          serviceAccount: kubernetesServiceAccount.metadata.name,
        },
      },
    },
  },
  { provider: cluster.provider, dependsOn: [appImage] }
);
const appService = new k8s.core.v1.Service(
  "app-service",
  {
    metadata: { labels: appDeployment.metadata.labels },
    spec: {
      type: "LoadBalancer",
      ports: [{ port: 80, targetPort: config.appPort }],
      selector: appDeployment.spec.template.metadata.labels,
    },
  },
  { provider: cluster.provider }
);
export const HPA = new k8s.autoscaling.v2beta2.HorizontalPodAutoscaler(
  "hpa",
  {
    metadata: {
      name: "hpa",
    },
    spec: {
      scaleTargetRef: {
        apiVersion: "apps/v1",
        kind: "Deployment",
        name: appDeployment.metadata.name,
      },
      // Choose at least 2 replicas for resiliency
      minReplicas: 2,
      // But a low max since this is a demo and we want to keep costs low
      maxReplicas: 3,
      metrics: [
        {
          type: "Resource",
          resource: {
            name: "cpu",
            target: {
              type: "Utilization",
              // Arbitrary choice
              averageUtilization: 35,
            },
          },
        },
      ],
    },
  },
  { parent: cluster.provider }
);

// Export the app deployment name so we can easily access it.
export let appName = appDeployment.metadata.name;

// Export the service's address.
export let appAddress = appService.status.apply(
  (s) => `http://${s.loadBalancer.ingress[0].ip}:${config.appPort}`
);

// Also export the Kubeconfig so that clients can easily access our cluster.
export let kubeConfig = cluster.kubeConfig;
