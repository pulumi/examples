[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecs-anywhere/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-ecs-anywhere/README.md#gh-dark-mode-only)

# ECS Anywhere

This example from our [ECS Anywhere launchblog post](https://pulumi.com/blog/ecs-anywhere-launch/) shows how to deploy an ECS cluster along with a dockerized app to Digital Ocean.

To do this, we use Pulumi infrastructure as code to provision an
[Elastic Container Service (ECS)](https://aws.amazon.com/ecs/) cluster, build our `Dockerfile` and deploy the
resulting image to a private [Elastic Container Registry (ECR)](https://aws.amazon.com/ecr/) repository, and then create
a set of DigitalOcean droplets behind a load balancer to allow for zero downtime updates.

## Prerequisites

- [Node.js](https://nodejs.org/en/download/)
- [Download and install the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/)
- [Connect Pulumi with your AWS account](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/) (if your AWS CLI is configured, no further changes are required)
- [Connect Pulumi with your DigitalOcean account](https://www.pulumi.com/docs/intro/cloud-providers/digitalocean/setup/)

## Running the Example

After cloning this repo, `cd` into it and run these commands:

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init dev
    ```

2. Set your desired AWS region:

    ```bash
    $ pulumi config set aws:region us-east-1 # any valid AWS region will work
    ```

3. Deploy everything with a single `pulumi up` command. This will show you a preview of changes first, which
   includes all of the required AWS resources (clusters, services, and the like). Don't worry if it's more than
   you expected -- this is one of the benefits of Pulumi, it configures everything so that so you don't need to!

    ```bash
    $ pulumi up
    ```

    After being prompted and selecting "yes", your deployment will begin. It'll complete in a few minutes:

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/ecs-anywhere/dev/updates/1

        Type                                Name                              Status      Info
    +   pulumi:pulumi:Stack                 ecs-anywhere-dev                  created
    +   ├─ awsx:ecr:Repository              app                               created     1 warning
    +   │  ├─ aws:ecr:Repository            app                               created
    +   │  └─ aws:ecr:LifecyclePolicy       app                               created
    +   ├─ aws:ecs:Cluster                  cluster                           created
    +   ├─ aws:cloudwatch:LogGroup          logGroup                          created
    +   ├─ digitalocean:index:Tag           lb                                created
    +   ├─ aws:iam:Role                     taskRole                          created
    +   ├─ aws:iam:Role                     taskExecutionRole                 created
    +   ├─ aws:iam:Role                     ssmRole                           created
    +   ├─ digitalocean:index:LoadBalancer  lb                                created
    +   ├─ aws:iam:RolePolicy               taskRolePolicy                    created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ecsanywhere-ecstaskexecution  created
    +   ├─ aws:ssm:Activation               ecsanywhere-ssmactivation         created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ssmrole-ec2containerservice   created
    +   ├─ aws:iam:RolePolicyAttachment     rpa-ssmrole-ssminstancecore       created
    +   ├─ digitalocean:index:Droplet       droplet-2                         created
    +   ├─ digitalocean:index:Droplet       droplet-1                         created
    +   ├─ aws:ecs:TaskDefinition           taskdefinition                    created
    +   └─ aws:ecs:Service                  service                           created

    Diagnostics:
    awsx:ecr:Repository (app):
        warning: #1 [internal] load build definition from Dockerfile
        #1 sha256:38516bdd0cbad0e22408bbea5254622aec0138fd2cf3ef0adfec28b25b5fc3f6
        #1 transferring dockerfile: 242B 0.0s done
        #1 DONE 0.0s

        #2 [internal] load .dockerignore
        #2 sha256:48fc15527102239b1078c71214dc7f13b0f1e36f5b6d2bb92b7843c8a52eca87
        #2 transferring context: 52B done
        #2 DONE 0.0s

        #3 [internal] load metadata for docker.io/library/node:15-alpine
        #3 sha256:3dbc53286eb8c9cc61fc3436f438c14e603ff5a4a39b4dbf83e6403c8122734d
        #3 DONE 1.4s

        #4 [stage-1 1/3] FROM docker.io/library/node:15-alpine@sha256:79dbee139880686354d8ea31ae98c287a1ac03a04923c75af22cbb24d396ade6
        #4 sha256:2fcd13beb7d7fc0a7254bcedd47bd6a63daf83eef047e0a57721ac2dee22c8d8
        #4 resolve docker.io/library/node:15-alpine@sha256:79dbee139880686354d8ea31ae98c287a1ac03a04923c75af22cbb24d396ade6 done
        #4 DONE 0.0s

        #6 [internal] load build context
        #6 sha256:9d76b7d0c1af07cbdc9cd5909bc6cd7d2279f635389c493d5c3fcc10b5487351
        #6 transferring context: 37.94kB done
        #6 DONE 0.0s

        #9 [build 5/5] COPY index.js .
        #9 sha256:88e8c9c9c09399aaf351c61e82acfea790c8358238358ce36bafb2f4aaed1268
        #9 CACHED

        #5 [stage-1 2/3] WORKDIR /app
        #5 sha256:e5cd7fae8686796a3a22187c0d8fc7d5f1d574933d8709ec36c1cdf5014fc961
        #5 CACHED

        #8 [build 4/5] RUN npm ci --only=production
        #8 sha256:aa2429a1c7cf640d6696a8b313e79c480bbb4e1c2ce88c6cbd089d034f009772
        #8 CACHED

        #7 [build 3/5] COPY package*.json .
        #7 sha256:1d00ba63335e1c92d8ef10babe377b4fafc733d922b999eb284cde3794b86cac
        #7 CACHED

        #10 [stage-1 3/3] COPY --from=build /app .
        #10 sha256:837831837e33fb84cd5c45920963c5c001d6579901f00b878698dd057a518485
        #10 CACHED

        #11 exporting to image
        #11 sha256:e8c613e07b0b7ff33893b694f7759a10d42e180f2b4dc349fb57dc6b71dcab00
        #11 exporting layers done
        #11 writing image sha256:80162f7caaef878182a6d0c102fc713dd3aca9ab69cd04e28ab7e2e1e410b0c0 done
        #11 naming to docker.io/library/12fda807-container done
        #11 DONE 0.0s

    Outputs:
        clusterName: "cluster-de98e7f"
        ip         : "165.227.252.130"

    Resources:
        + 20 created

    Duration: 1m30s
    ```

4. At this point, your app is running! The URL was published so it's easy to interact with:

    ```bash
    $ curl http://$(pulumi stack output ip)
    Hello World from Pulumi
    ```

5. Once you are done, there is an additional step before running the usual pulumi destroy. This is because the nodes are registered to AWS Systems Manager and the ECS cluster as part of the node setup and happen outside of the Pulumi stack. Run the following in your command line (you’ll need to install [jq](https://stedolan.github.io/jq/) for this to work):

    ```bash
    $ aws ssm describe-instance-information | jq ".InstanceInformationList | .[] | .InstanceId" | grep "mi-" | xargs -L 1 aws ssm deregister-managed-instance --instance-id

    $ aws ecs list-container-instances --cluster ${pulumi stack output clusterName} | jq ".containerInstanceArns | .[]" | xargs -L 1 aws ecs deregister-container-instance --cluster ${pulumi stack output clusterName} --force --container-instance

    $ pulumi refresh -y
    $ pulumi destroy
    $ pulumi stack rm
    ```
