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

1. Run `pulumi init`. (Note: this command will not be required in a future SDK release.)

1. Create a new stack:

    ```
    $ pulumi stack init
    Enter a stack name: testing
    ```

1. Set the provider and region:

    ```
    $ pulumi config set cloud:provider aws
    $ pulumi config set aws:region us-west-2
    ```

1. Configure Pulumi to create a new ECS cluster. (Note: This configuration provisions a number of resources, but the experience will be **substantially** improved in a later version of `@pulumi/cloud`.)

    ```
    $ pulumi config set cloud-aws:ecsAutoCluster true
    ```

1. Set a value for the Redis password. The value can be an encrypted secret, specified with the `--secret` flag. If this flag is not provided, the value will be saved as plaintext in `Pulumi.testing.yaml` (since `testing` is the current stack name).

    ```
    $ pulumi config set --secret redisPassword S3cr37Password
    Enter your passphrase to protect config/secrets: 
    Re-enter your passphrase to confirm:     
    ```

### Compile the TypeScript program

1. Restore NPM modules via `npm install`.

1. Compile the program via `tsc` or `npm run build`.

### Preview and deploy

1. Ensure the Docker daemon is running on your machine, then preview changes via `pulumi preview`. This step will create the Docker container but will not provision resources. If you encrypted the value for the `redisPassword` key, you'll be prompted for your password before each `preview` and `update` operation.

    ```
    $ pulumi preview --summary
    [...details omitted...]
    info: 50 changes previewed:
        + 50 resources to create
    ```

1. Deploy the changes with `pulumi update`. Since this actually deploys a number of resources, it will take about 20-30 minutes to complete. (An upcoming improvement in `@pulumi/cloud` will substantially reduce the deployment time.) Note the stack output property `frontendUrl`, which shows the URL and port of the deployed app:

    ```bash
    $ pulumi update
    [...details omitted...]
    ---outputs:---
    frontendURL: "http://pulumi-vo-ne2-d7f97ef-7c5e2c22a22ec44a.elb.us-west-2.amazonaws.com:34567"
    ```

1. In a browser, navigate to the URL for `frontendURL`. You should see the voting app webpage.

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
