# Voting app with two containers

A simple voting app that uses Redis for a data store and a Python Flask app for the frontend. The example has been ported from https://github.com/Azure-Samples/azure-voting-app-redis.

The example shows how easy it is to deploy containers into production and to connect them to one another. Since the example defines a custom container, Pulumi does the following:
- Builds the Docker image
- Provisions AWS Container Registry (ECR) instance
- Pushes the image to the ECR instance
- Creates a new ECS task definition, pointing to the ECR image definition

## Prerequisites

To use this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Deploying and running the program

### Configure the deployment  

1.  Initialize a Pulumi repository with pulumi init, using your GitHub username. (Note: this step will be removed in the future.)

    ```
    $ pulumi init --owner githubUsername
    ```

1.  Login via `pulumi login`.

1.  Create a new stack:

    ```
    $ pulumi stack init testing
    ```

1.  Set AWS as the provider:

    ```
    $ pulumi config set cloud:provider aws
    ```

1.  Configure Pulumi to use AWS Fargate, which is currently only available in `us-east-1`:

    ```
    $ pulumi config set aws:region us-east-1
    $ pulumi config set cloud-aws:useFargate true
    ```

1.  Set a value for the Redis password. The value can be an encrypted secret, specified with the `--secret` flag. If this flag is not provided, the value will be saved as plaintext in `Pulumi.testing.yaml` (since `testing` is the current stack name).

    ```
    $ pulumi config set --secret redisPassword S3cr37Password
    ```

### Compile the TypeScript program

1.  Restore NPM modules via `npm install`.

1.  Compile the program via `tsc` or `npm run build`.

### Preview and deploy

1.  Ensure the Docker daemon is running on your machine, then preview changes via `pulumi preview`. This step will create the Docker container but will not provision resources. 

    ```
    $ pulumi preview
    Previewing stack 'testing' in the Pulumi Cloud ☁️
    Previewing changes:

    global:                                               * Would not change, 1 info message(s). info: Building container image 'pulum-df6d90cb-container': context=./frontend...
    pulumi:Stack("voting-app-testing"):                   Running, 56 info message(s). info: b542772b4177: Download complete...
    aws:Cluster("pulumi-testing-global"):                 + Would create
    cloud:infrastructure("global-infrastructure"):        + Would create
    pulumi:Stack("voting-app-testing"):                   Running, 56 info message(s). info: b542772b4177: Download complete...
    aws:Repository("pulum-df6d90cb-container"):               + Would create
    pulumi:Stack("voting-app-testing"):                       Running, 143 info message(s). info: Successfully tagged pulum-df6d90cb-container:latest...
    ws:Role("pulumi-testing-execution"):                     + Would create
    pulumi:Stack("voting-app-testing"):                       Completed, 143 info message(s). info: Successfully tagged pulum-df6d90cb-container:latest
    aws:LogGroup("voting-app-cache"):                         + Would create
    aws:RolePolicyAttachment("pulumi-tes-task-32be53a2"):     + Would create
    aws:RolePolicyAttachment("pulumi-tes-task-fd1a00e5"):     + Would create
    aws:RolePolicyAttachment("pulumi-testing-execution"):     + Would create
    aws:Function("pulumi-testing"):                           + Would create
    aws:Role("pulumi-testing"):                               + Would create
    aws:Function("pulumi-testing")-1:                         + Would create
    aws:RolePolicyAttachment("pulumi-testing-32be53a2"):      + Would create
    aws:TargetGroup("22582cb2"):                              + Would create
    aws:SecurityGroup("pulumi-testing-global"):               + Would create
    aws:LoadBalancer("22582cb2"):                             + Would create
    aws:Permission("pulumi-testing"):                         + Would create
    aws:LogSubscriptionFilter("voting-app-cache"):            + Would create
    aws:Listener("voting-app-cache-redis-6379"):              + Would create
    cloud:Service("voting-app-frontend"):                     + Would create
    aws:TaskDefinition("voting-app-cache"):                   + Would create
    aws:LogGroup("voting-app-frontend"):                      + Would create
    aws:TargetGroup("8f351c44"):                              + Would create
    aws:LoadBalancer("8f351c44"):                             + Would create
    aws:Service("voting-app-cache"):                          + Would create
    aws:LogSubscriptionFilter("voting-app-frontend"):         + Would create
    aws:Listener("voting-app-frontend-votingAppFrontend-80"): + Would create
    aws:TaskDefinition("voting-app-frontend"):                + Would create
    aws:Service("voting-app-frontend"):                       + Would create

    global: Diagnostics
      info: Building container image 'pulum-df6d90cb-container': context=./frontend


    pulumi:Stack("voting-app-testing"): Diagnostics
      info: Sending build context to Docker daemon  12.29kB
      [... output omitted ...]
      info: Successfully tagged pulum-df6d90cb-container:latest

    info: 32 changes previewed:
        + 32 resources to create
    ```

1.  Deploy the changes with `pulumi update`. Since this deploys a number of resources, it will take about 15 minutes to complete. 

    ```bash
    $ pulumi update
    Updating stack 'testing' in the Pulumi Cloud ☁️
    Performing changes:

    global:                                                   * Unchanged, 1 info message(s). info: Building container image 'pulum-df6d90cb-container': context=./frontend...
    pulumi:Stack("voting-app-testing"):                       Running, 96 info message(s). info: latest: digest: sha256:ff29b6c6ee435992b28b34602b294cac4fe6715df1e6f5fe680fd684d2cbec64 size:9...
    pulumi:Stack("voting-app-testing"):                       Running, 96 info message(s). info: latest: digest: sha256:ff29b6c6ee435992b28b34602b294cac4fe6715df1e6f5fe680fd684d2cbec64 siz..
    pulumi:Stack("voting-app-testing"):                       Running, 96 info message(s). info: latest: digest: sha256:ff29b6c6ee435992b28b34602b294cac4fe6715df1e6f5fe680fd684d2cbec64 si...
    global:                                                   * Unchanged, 1 info message(s). info: Building container image 'pulum-df6d90cb-container': context=./frontend
    pulumi:Stack("voting-app-testing"):                       Running, 96 info message(s). info: latest: digest: sha256:ff29b6c6ee435992b28b34602b294cac4fe6715df1e6f5fe680fd684d2cbec64 size.
    pulumi:Stack("voting-app-testing"):                       Completed, 96 info message(s). info: latest: digest: sha256:ff29b6c6ee435992b28b34602b294cac4fe6715df1e6f5fe680fd684d2cbec64 siz
    ws:Role("pulumi-testing-execution"):                     + Created
    cloud:LogCollector("pulumi-testing"):                     + Created
    aws:SecurityGroup("pulumi-testing-global"):               + Created
    aws:LogGroup("voting-app-cache"):                         + Created
    aws:TargetGroup("22582cb2"):                              + Created
    aws:LoadBalancer("22582cb2"):                             + Created
    aws:RolePolicyAttachment("pulumi-tes-task-32be53a2"):     + Created
    aws:RolePolicyAttachment("pulumi-tes-task-fd1a00e5"):     + Created
    aws:RolePolicyAttachment("pulumi-testing-execution"):     + Created
    aws:Function("pulumi-testing"):                           + Created
    aws:Listener("voting-app-cache-redis-6379"):              + Created
    cloud:Service("voting-app-frontend"):                     + Created
    aws:TaskDefinition("voting-app-cache"):                   + Created
    aws:Role("pulumi-testing"):                               + Created
    aws:LogGroup("voting-app-frontend"):                      + Created
    aws:TargetGroup("8f351c44"):                              + Created
    aws:LoadBalancer("8f351c44"):                             + Created
    aws:Service("voting-app-cache"):                          + Created
    aws:Function("pulumi-testing")-1:                         + Created
    aws:RolePolicyAttachment("pulumi-testing-32be53a2"):      + Created
    aws:Listener("voting-app-frontend-votingAppFrontend-80"): + Created
    aws:TaskDefinition("voting-app-frontend"):                + Created
    aws:Permission("pulumi-testing"):                         + Created
    aws:LogSubscriptionFilter("voting-app-cache"):            + Created
    aws:LogSubscriptionFilter("voting-app-frontend"):         + Created
    aws:Service("voting-app-frontend"):                       + Created

    global: Diagnostics
      info: Building container image 'pulum-df6d90cb-container': context=./frontend

    pulumi:Stack("voting-app-testing"): Diagnostics
      [... details omitted ...]

    info: 32 changes performed:
        + 32 resources created
    Update duration: 11m44.627933815s

    Permalink: https://pulumi.com/lindydonna/examples/voting-app/testing/updates/4
    ```

1.  View the stack output properties via `pulumi stack output`. The stack output property `frontendUrl` is the URL and port of the deployed app:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
        OUTPUT                                           VALUE
        frontendURL                                      8f351c44-1cb535f-5115dd91f58e57fa.elb.us-east-1.amazonaws.com
    ```

1.  In a browser, navigate to the URL for `frontendURL`. You should see the voting app webpage.

   ![Voting app screenshot](./voting-app-webpage.png)

### Delete resources

When you're done, run `pulumi destroy` to delete the program's resources:

```
$ pulumi destroy
This will permanently destroy all resources in the 'testing' stack!
Please confirm that this is what you'd like to do by typing ("testing"): testing
```

## About the code

At the start of the program, the following lines retrieve the value for the Redis password by reading a [configuration value](https://docs.pulumi.com/reference/config.html). This is the same value that was set above with the command `pulumi config set redisPassword <value>`:

```typescript
let config = new pulumi.Config("voting-app");
let redisPassword = config.require("redisPassword"); 
```

In the program, the value can be used like any other variable. 

### Resources

The program provisions two top-level resources with the following commands:

```typescript
let redisCache = new cloud.Service("voting-app-cache", ... )
let frontend = new cloud.Service("voting-app-frontend", ... )
```

The definition of `redisCache` uses the [`image` property of `cloud.Service`](https://docs.pulumi.com/packages/pulumi-cloud/interfaces/_service_.container.html#image) to point to an existing Docker image. In this case, this is the image `redis` at tag `alpine` on Docker Hub. The `redisPassword` variable is passed to the startup command for this image.

The definition of `frontend` is more interesting, as it uses [`build` property of `cloud.Service`](https://docs.pulumi.com/packages/pulumi-cloud/interfaces/_service_.container.html#build) to point to a folder with a Dockerfile, which in this case is a Python Flask app. Pulumi automatically invokes `docker build` for you and pushes the container to ECR. 

So that the `frontend` container can connect to `redisCache`, the environment variables `REDIS`, `REDIS_PORT` are defined. Using the `redisCache.endpoints` property, it's easy to declare the connection between the two containers. 

The Flask app uses these environment variables to connect to the Redis cache container. See the following in [`frontend/app/main.py`](frontend/app/main.py):

```python
redis_server =   os.environ['REDIS']
redis_port =     os.environ['REDIS_PORT']
redis_password = os.environ['REDIS_PWD']
```
