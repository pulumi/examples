// Copyright 2026, Pulumi Corporation.
// The agent software factory, delivered as code.
//
// Replaces `npm run orchestrate -- up` (scripts/orchestrate.ts, Automation API,
// your laptop, your AWS session) with a Pulumi Delivery pipeline that Pulumi
// Cloud runs on every push to main.
//
//   llm  ->  platform  ->  factory | agent | triage  ->  bootstrap -> verify  ->  seed
//   [cluster stage]  [platform stage]  [ ---------- services stage ---------- ]  [demo]
//
// Register with:  pulumi up   (in this directory, on stack my-org/software-factory-delivery/main)

import * as pulumi from "@pulumi/pulumi";
import * as delivery from "@pulumi/delivery";

const cfg = new pulumi.Config();

/** Pulumi org that owns the target stacks. The pipeline stack lives here too. */
const org = cfg.get("org") ?? "my-org";
/** Stack name shared by all five projects, e.g. "dev". */
const env = cfg.get("env") ?? "dev";
/** Owner tag. Shared AWS accounts delete untagged resources. */
const owner = cfg.require("owner"); // e.g. you@example.com
/** Pulumi usernames or team names that may approve the cluster stage. */
const approvers = cfg.getObject<string[]>("approvers") ?? ["my-pulumi-user"];
/** Factory project the bootstrap and seed jobs talk to. */
const factoryProject = cfg.get("factoryProject") ?? "agent-factory-demo";
/** The brief the factory agents work from. Set it per project, not from a file in the repo. */
const projectBrief = cfg.get("projectBrief") ?? "Build a simple web instant messenger application in Vite and Node.JS that allows a team to send messages to each other in a session using websockets.";
/** Branch the release is cut from. Point at a test branch to try the pipeline. */
const branch = cfg.get("branch") ?? "main";
/** Repository the release is cut from, as `owner/repo`. */
const repository = cfg.get("repository") ?? "your-github-org/software-factory";

/** `project/stack` — what a Stacks entry's `stack` wants (org is implied). */
const target = (project: string) => `${project}/${env}`;
/** `org/project/stack` — what a StackReference config value wants. */
const ref = (project: string) => `${org}/${project}/${env}`;

// ---------------------------------------------------------------- source

// One repo, one release. Path globs keep doc and script edits from kicking off
// a 45-minute GPU bring-up; everything under stacks/, apps/ and delivery/ does.
const repo = new delivery.GitHubSource("factory", {
    repository,
    branch,
    trigger: { paths: ["stacks/**", "apps/**", "delivery/**"] },
});

const pipeline = new delivery.Pipeline("software-factory", {
    program: { source: repo, directory: "delivery" },
});

// ---------------------------------------------------------------- stages

// These are bring-up phases, not environments. The five stacks form a chain
// (llm -> platform -> factory|agent|triage) and the phases give each link its
// own retry boundary: a triage failure must not re-run the GPU cluster.
//
// An approval gate on the entry stage is the cost control. `approval()` shows
// the approver a preview of the llm update, so "no changes" is visible before
// anyone clicks, and a node-group replacement is equally visible — which is
// also why the gate carries no description: approval() takes only `approvers`,
// `count` and `name`. The preview is the explanation.
const cluster = new delivery.Stage("cluster", {
    pipeline,
    when: delivery.approval({ approvers }),
});

const platform = new delivery.Stage("platform", { pipeline, from: [cluster] });

const services = new delivery.Stage("services", { pipeline, from: [platform] });

const demo = new delivery.Stage("demo", {
    pipeline,
    from: [services],
    when: delivery.manual({ description: "Seed the Factory board with demo work items?" }),
});

// ---------------------------------------------------------------- cluster

// Nothing special for the runner: stacks/llm pins the released AICR SDK
// (pulumi-labs-nvidia-aicr 0.3.x), which resolves its own plugin from GitHub
// releases, so `pulumi install` on the default image is enough.
const llm = new delivery.Stacks("llm", {
    stage: cluster,
    stacks: {
        llm: {
            stack: target("llm"),
            source: repo,
            directory: "stacks/llm",
            timeout: 3600, // a cold bring-up is ~45 min
            config: {
                "llm:owner": owner,
                "llm:clusterName": "software-factory",
                "llm:instanceType": "g6.2xlarge",
                "llm:nodeCount": "2",
                "llm:model": "Qwen/Qwen3-8B",
                "llm:modelReplicas": "2",
                "llm:toolCallParser": "hermes",
                "llm:reasoningParser": "qwen3",
                "llm:maxModelLen": "16384",
                "llm:validate": "false",
            },
        },
    },
});

// llm exports kubeconfig as a secret, so the whole outputs map is secret.
// That is fine for `environment`, and it is why nothing below puts an llm
// output into a Stacks `config` map, which rejects secrets.
const kubeconfig = llm.outputs.apply(o => String(o["llm"]["kubeconfig"]));

// ---------------------------------------------------------------- platform

const platformStacks = new delivery.Stacks("platform", {
    stage: platform,
    stacks: {
        platform: {
            stack: target("platform"),
            source: repo,
            directory: "stacks/platform",
            config: {
                "platform:llmStack": ref("llm"),
                "platform:owner": owner,
                // The brief the agents work from, set in this pipeline's configuration.
                "platform:projectBrief": projectBrief,
            },
        },
    },
});

// ---------------------------------------------------------------- services

// factory, agent and triage each reference platform (triage also references
// llm) but never each other, so one group updates all three side by side.
// Three entries is three slots of the org concurrency limit.
const serviceStacks = new delivery.Stacks("services", {
    stage: services,
    stacks: {
        factory: {
            stack: target("factory"),
            source: repo,
            directory: "stacks/factory",
            config: { "factory:platformStack": ref("platform"), "factory:owner": owner },
        },
        agent: {
            stack: target("agent"),
            source: repo,
            directory: "stacks/agent",
            config: { "agent:platformStack": ref("platform"), "agent:owner": owner },
        },
        triage: {
            stack: target("triage"),
            source: repo,
            directory: "stacks/triage",
            config: {
                "triage:platformStack": ref("platform"),
                "triage:llmStack": ref("llm"),
                "triage:owner": owner,
            },
        },
    },
});

// Runner settings shared by every job: kubectl, the repo's dev deps, and a
// kubeconfig materialized from the llm stack's secret output.
const kubeJob = {
    source: repo,
    directory: "delivery",
    image: { reference: "pulumi/pulumi-nodejs:3.272.0" },
    preRunCommands: [
        "curl -fsSLo /usr/local/bin/kubectl https://dl.k8s.io/release/v1.31.0/bin/linux/amd64/kubectl",
        "chmod +x /usr/local/bin/kubectl",
    ],
};

// scripts/bootstrap.ts: service account, Factory model + project, health wait.
// Idempotent, so it runs on every release rather than once by hand.
const bootstrap = new delivery.Job("bootstrap", {
    ...kubeJob,
    stage: services,
    command: "sh jobs/bootstrap.sh",
    environment: {
        KUBECONFIG_DATA: kubeconfig,
        FACTORY_PROJECT: factoryProject,
        // Depending on this output is what orders bootstrap after the group.
        FACTORY_URL: serviceStacks.outputs.apply(o => String(o["factory"]["factoryInternalUrl"])),
    },
});

// scripts/compat-check.ts: 22 cross-stack contract checks plus in-cluster
// reachability probes from the agent pod.
//
// The job's PULUMI_ACCESS_TOKEN is scoped to the pipeline stack, so the script
// cannot shell out to `pulumi stack output` for the five targets. The outputs
// come in as JSON on the environment instead — see the repo delta in README.md.
new delivery.Job("verify", {
    ...kubeJob,
    stage: services,
    command: "sh jobs/verify.sh",
    environment: {
        KUBECONFIG_DATA: kubeconfig,
        OWNER: owner,
        LLM_OUTPUTS: llm.outputs.apply(o => JSON.stringify(o["llm"])),
        PLATFORM_OUTPUTS: platformStacks.outputs.apply(o => JSON.stringify(o["platform"])),
        SERVICES_OUTPUTS: serviceStacks.outputs.apply(o => JSON.stringify(o)),
    },
}, { dependsOn: [bootstrap] }); // dependsOn orders Delivery resources

// ---------------------------------------------------------------- demo

new delivery.Job("seed", {
    ...kubeJob,
    stage: demo,
    command: "sh jobs/seed.sh",
    environment: { KUBECONFIG_DATA: kubeconfig, FACTORY_PROJECT: factoryProject },
});

// ---------------------------------------------------------------- artifacts

// What the next pipeline needs, published per stage. A downstream pipeline
// reads these with a PipelineSource instead of a StackReference into my-org:
//
//   const sf = new delivery.PipelineSource("sf", {
//       pipeline: "software-factory-delivery/main", stage: "services", trigger: true });
//   const base = sf.artifacts["llmBaseUrl"];
//
// Anything derived from llm.outputs inherits its secret bit, so clusterName is
// a secret artifact and so is the whole artifacts map a consumer sees.
new delivery.Artifact("clusterName", {
    stage: cluster,
    value: llm.outputs.apply(o => o["llm"]["cluster_name"]),
});

new delivery.Artifact("llmBaseUrl", {
    stage: platform,
    value: platformStacks.outputs.apply(o => o["platform"]["llmBaseUrl"]),
});

new delivery.Artifact("factoryInternalUrl", {
    stage: services,
    value: serviceStacks.outputs.apply(o => o["factory"]["factoryInternalUrl"]),
});

export const release = pipeline.releaseNumber;
export const commit = repo.commit;
