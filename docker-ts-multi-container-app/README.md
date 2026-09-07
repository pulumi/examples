[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-ts-multi-container-app/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-ts-multi-container-app/README.md#gh-dark-mode-only)

# Docker multi-container example

This example Pulumi application runs two containers locally, one Redis container and one built from the application in the `app` folder. The application queries the Redis database and returns the number of times the page has been viewed.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)
3. [Install Docker](https://docs.docker.com/get-docker/) and have it running

## Deploying the example

1.  Create a new stack, which is an isolated deployment target for this example:

    ```bash
    pulumi stack init dev
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Preview and deploy the app via `pulumi up`. The preview will take a few minutes, as it builds a Docker container.

    ```bash
    pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/docker-ts-multi-container-app/dev/updates/1

        Type                         Name                               Status
    +   pulumi:pulumi:Stack          docker-ts-multi-container-app-dev  created
    +   ├─ docker:image:Image        appImage                           create
    +   ├─ docker:index:Network      network                            create
    +   ├─ docker:index:RemoteImage  redisImage                         create
    +   ├─ docker:index:Container    redisContainer                     create
    +   └─ docker:index:Container    appContainer                       create

    Outputs:
        url: "http://localhost:3000"

    Resources:
        + 6 created

    Duration: 19s
    ```

1.  View the endpoint URL, and run curl:

    ```bash
    pulumi stack output
    curl $(pulumi stack output url)
    ```

    ```
    Current stack outputs (1)
        OUTPUT                  VALUE
        url                http://localhost:3000
    I have been viewed 1 times
    ```

1.  Repeat the previous command multiple times to see the number of views increase.

## Cleaning up

Once you are done, you can destroy all of the resources, and the stack:

```bash
pulumi destroy
pulumi stack rm
```
