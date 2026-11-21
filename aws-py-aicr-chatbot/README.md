[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-aicr-chatbot/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-aicr-chatbot/README.md#gh-dark-mode-only)

# Chatbot on Amazon EKS with NVIDIA Dynamo

This example serves a public chatbot whose answers come from an open-weight LLM. The model runs on NVIDIA Dynamo on an Amazon EKS cluster with two NVIDIA L4 GPUs. The whole GPU software stack is deployed by one `ClusterStack` resource from the Pulumi NVIDIA AICR provider.

It creates:

- An **EKS cluster** with two `g6.2xlarge` GPU nodes on Ubuntu.
- The **AICR-validated inference stack** (GPU Operator, DRA driver, KAI scheduler, Prometheus, cert-manager, agentgateway, Grove and the Dynamo platform), from one `ClusterStack`.
- A **Dynamo graph** that serves an open-weight model on both GPUs.
- A **chat application** container, pushed to Amazon ECR, behind a public load balancer.

The program is about $2.20 per hour while the stack is up. Run `pulumi destroy` when you are done.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/). Use an account with quota for two `g6.2xlarge` instances.
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/). Python 3.12 is recommended.
1. [Install Docker](https://docs.docker.com/get-docker/) with buildx enabled. The chat application image is built locally.
1. Install `kubectl` and `helm`.

## Deploying the example

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the AWS region and the owner tag:

    ```bash
    pulumi config set aws:region us-west-2
    pulumi config set owner you@example.com
    ```

    The `owner` tag is required. Shared sandbox accounts delete untagged resources.

1. Install dependencies:

    ```bash
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Run `pulumi up` to preview and deploy the stack. The first deployment takes about 30 minutes, mostly for the EKS cluster, the GPU software and the model download:

    ```bash
    pulumi up
    ```

1. Open the chat page. Its URL is the `chat_url` stack output:

    ```bash
    pulumi stack output chat_url
    ```

    Open the URL in a browser and ask a question. The answer streams in, and the page shows tokens per second.

## Cleaning up

Destroy the resources, then remove the stack to avoid incurring any additional cost:

```bash
pulumi destroy
pulumi stack rm
```

Run `./leakcheck.sh` afterwards to list load balancers, volumes, roles and node groups that might remain.

## Summary

The GPU software stack is the main point of the example. The program turns five inputs (`h100`, `eks`, `inference`, `dynamo`, `ubuntu`) into NVIDIA's validated recipe. That recipe becomes about 16 Helm releases, in dependency order, each one a Pulumi resource. `gpu_stack.py` contains that logic.

The program is in `__main__.py`. It is organized in layers that you can read top to bottom: `cluster.py`, `gpu_stack.py`, `gate.py`, `model.py` and `chatbot.py`.

## Configuration

| Key | Default | Description |
|---|---|---|
| `aws:region` | `us-west-2` | The AWS region to deploy into. |
| `owner` | (required) | The `Owner` tag applied to every resource. |
| `clusterName` | `aicr-chatbot` | The name of the EKS cluster. |
| `instanceType` | `g6.2xlarge` | The GPU instance type. `g5.2xlarge` is a fallback. |
| `nodeCount` | `2` | The number of GPU nodes. |
| `model` | `Qwen/Qwen2.5-1.5B-Instruct` | The model that Dynamo serves. |
| `modelReplicas` | `2` | The number of model workers, one per GPU. |
| `k8sVersion` | `1.35` | The Kubernetes version. |
| `validate` | `false` | Set to `true` to run AICR's deployment and conformance checks. |
| `hfToken` | (none) | An optional Hugging Face token, stored as a secret. |

## Next steps

- Run the tests with `python -m pytest tests -q` from the example root. They run the program under Pulumi mocks, and they also test the gate script against a fake `kubectl`.
- Run the chat application locally without a GPU. Start the stub model with `python tests/stub_llm.py 8000` in `app/`, then run `LLM_BASE_URL=http://127.0.0.1:8000 uvicorn main:app --port 8080`.

## Troubleshooting

- **The `owner` tag is required.** The sandbox cleanup process deletes untagged EKS clusters, node groups, IAM roles, ECR repositories, load balancers and security groups after about an hour. The program tags everything it creates. Do not remove the tags.
- **AWS sessions expire.** Log in again, for example with `aws sso login`, before you run `pulumi` commands.
- **The first `pulumi up` can hit a webhook race** inside the recipe. Re-run `pulumi up`. The gate in `wait-for-dynamo.sh` waits for the Dynamo operator, its CRD and its webhook, and for GPU capacity, before it creates the `DynamoGraphDeployment`.
- **`InsufficientInstanceCapacity` for `g6.2xlarge`** happens per availability zone. The node group spans five zones and retries. If it keeps failing, set `instanceType` to `g5.2xlarge`.
- **Helm releases with install hooks fail** if no node has joined yet. Re-run `pulumi up` after the nodes are ready.
- **The chat page is public and unauthenticated.** Responses are bounded by `max_tokens`, a short history window and a prompt character budget. The model API itself is not exposed. Destroy the stack after your demo.
- **Version warnings during `pulumi destroy`** (`using an older version of package …`) are expected. The EKS and AICR packages create resources with their own bundled `aws` and `kubernetes` versions, and Pulumi deletes each resource with the version that created it.
