// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

import { readFileSync } from "fs";
import * as docker from "@pulumi/docker";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as cluster from "./cluster";
import * as config from "./config";
import * as db from "./db";
import * as iam from "./iam";
import { dockerRegistry, dockerRegistryId } from "./artifact-registry";
import { execSync } from "child_process";

// Tag images as name:${projectVersion}-${gitHash}
// This makes them human-readable and also deterministically linkable to code
const gitHash = execSync("git rev-parse --short HEAD").toString().trim();
const projectVersion = readFileSync("../VERSION.txt", "utf8").trim();

// We build and push the image to the GCP project's Artifact Registry.
// Make sure docker is configured to use docker registry by running
// > gcloud auth configure-docker
// before running pulumi up
const appImageName = pulumi.interpolate`us-docker.pkg.dev/${config.projectId}/${dockerRegistryId}/app:${projectVersion}-${gitHash}`;
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
      name: config.k8sServiceAccountName,
      annotations: {
        "iam.gke.io/gcp-service-account": iam.serviceAccount.email,
      },
    },
  },
  { provider: cluster.provider, dependsOn: [cluster.provider] }
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
const dbInstance = pulumi.interpolate`${config.projectId}:${config.region}:${db.instance.name}`;
const SQLProxyContainer = {
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
  {
    provider: cluster.provider,
    dependsOn: [appImage, cluster.provider, kubernetesServiceAccount],
  }
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
  { provider: cluster.provider, dependsOn: [cluster.provider] }
);

// Export the app deployment name so we can easily access it.
export let appName = appDeployment.metadata.name;

// Export the service's address.
export let appAddress = appService.status.apply(
  (s) => `http://${s.loadBalancer.ingress[0].ip}:${config.appPort}`
);

// Also export the Kubeconfig so that clients can easily access our cluster.
export let kubeConfig = cluster.kubeConfig;
