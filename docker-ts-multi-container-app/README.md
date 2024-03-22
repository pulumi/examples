[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-ts-multi-container-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-ts-multi-container-app/README.md#gh-dark-mode-only)

# Docker multi-container example

This example Pulumi application runs two containers locally, one Redis container and one built from the application in the `app` folder. The application queries the Redis database and returns the number of times the page has been viewed.

## Prerequisites

To run this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Preview and deploy the app via `pulumi up`. The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

    ```
    $ pulumi up
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

    Diagnostics:
    docker:image:Image (appImage):
        warning: #1 [internal] load build definition from Dockerfile
        #1 sha256:0d4d685ddff69a0240b26fdc352c1ce914133b71c905d1fa977c90c87fd2146a
        #1 transferring dockerfile: 36B done
        #1 DONE 0.4s

        #2 [internal] load .dockerignore
        #2 sha256:24180ce9fb5e863c8cdccc1dd5cecca0118d138fd1a387c2ba99c0bd73eb0b46
        #2 transferring context: 2B done
        #2 DONE 0.5s

        #3 [internal] load metadata for docker.io/library/node:16-alpine
        #3 sha256:93febbdbcf5a756e6e084d46d56976a0630ae35cc38d744d3fb69ab9a7ce9b20
        #3 DONE 0.7s

        #4 [1/5] FROM docker.io/library/node:16-alpine@sha256:6b56197d33a56cd45d1d1214292b8851fa1b91b2ccc678cee7e5fd4260bd8fae
        #4 sha256:155f61a07d0d5bd3922125fe0a1f61b6ad7c80fd53ad17af2014022698792303
        #4 DONE 0.0s

        #6 [internal] load build context
        #6 sha256:de51bb2a6c39944feaa85aac4b0ef727d42885f4ce1547e0d76a290b76cdb7ec
        #6 transferring context: 62B done
        #6 DONE 0.2s

        #5 [2/5] WORKDIR /app
        #5 sha256:36e7704b507e21cfc90eb97c19f220899eebe00ef73ab450f2f9b689e02e3154
        #5 CACHED

        #7 [3/5] COPY package.json .
        #7 sha256:54933f5857daeae271dc204a253bbf96c17b66dac0dc2a94dfc082a68964cb6d
        #7 CACHED

        #8 [4/5] RUN npm i
        #8 sha256:75557c22149d35804b54234ece9155528520503babaad06969c30e8d0b5af67d
        #8 CACHED

        #9 [5/5] COPY index.js .
        #9 sha256:704a81bac2b5e5318ca3a0ca730516ff27bec81defa1333e99b1d5b31cf8835d
        #9 CACHED

        #10 exporting to image
        #10 sha256:e8c613e07b0b7ff33893b694f7759a10d42e180f2b4dc349fb57dc6b71dcab00
        #10 exporting layers done
        #10 writing image sha256:9ec8e52bb05a93f69a72db72407265586836d85a612578c39c6883b291c18ce3
        #10 writing image sha256:9ec8e52bb05a93f69a72db72407265586836d85a612578c39c6883b291c18ce3 0.1s done
        #10 naming to docker.io/library/app done
        #10 DONE 0.3s

    Outputs:
        url: "http://localhost:3000"

    Resources:
        + 6 created

    Duration: 19s
    ```

1.  View the endpoint URL, and run curl:

    ```bash
    $ pulumi stack output
    Current stack outputs (1)
        OUTPUT                  VALUE
        url                http://localhost:3000

    $ curl $(pulumi stack output url)
    I have been viewed 1 times
    ```

1. Repeat the previous command multiple times to see the number of views increase.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
