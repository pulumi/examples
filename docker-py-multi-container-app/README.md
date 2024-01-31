[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-py-multi-container-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-py-multi-container-app/README.md#gh-dark-mode-only)

# Docker multi-container example

This example Pulumi application runs two containers locally, one Redis container and one built from the application in the `app` folder. The application queries the Redis database and returns the number of times the page has been viewed.

## Prerequisites

To run this example, make sure [Docker](https://docs.docker.com/engine/installation/) is installed and running.

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Start your virtual environment:

    ```
    $ python -m venv venv && source venv/bin/activate
    ```

1. Restore your pypi packages:

    ```
    $ pip3 install -r requirements.txt
    ```

1.  Preview and deploy the app via `pulumi up`. The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

    ```
    $ pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/docker-py-multi-container-app/dev/updates/1

        Type                         Name                               Status
    +   pulumi:pulumi:Stack          docker-py-multi-container-app-dev  created
    +   ├─ docker:image:Image        app_image                          create
    +   ├─ docker:index:RemoteImage  redis_image                        create
    +   ├─ docker:index:Network      network                            create
    +   ├─ docker:index:Container    redis_container                    create
    +   └─ docker:index:Container    app_container                      create

    Diagnostics:
    docker:image:Image (app_image):
        warning: #1 [internal] load build definition from Dockerfile
        #1 sha256:b739b27015822bce5614ba366a6721d70d7ea4ae16ea03a33f4224da521be91e
        #1 transferring dockerfile: 37B done
        #1 DONE 0.4s

        #2 [internal] load .dockerignore
        #2 sha256:f653c4e211b2edb1373c796563597188d9df119e7b1b407b4ddfeb69e5ce4627
        #2 transferring context: 2B done
        #2 DONE 0.6s

        #3 [internal] load metadata for docker.io/library/python:3.7-alpine
        #3 sha256:6aa3fbe2d5daab236c694fe35aaf5e88aa0902955f2d77235216c44ae1323666
        #3 DONE 0.8s

        #4 [1/6] FROM docker.io/library/python:3.7-alpine@sha256:deaefc5e07ef1f3420411dd5225b2fc2ab23ae7731e8cb216d9fe74557d81db5
        #4 sha256:82f948fcc2a923c2c13ed38a5fcf5bf8558171bbb467fadffe1073b8a0e1e3fb
        #4 DONE 0.0s

        #7 [internal] load build context
        #7 sha256:c8fe78dcc1589d79144adac7b1226e077b97fb6313de000e8e59150bc37ba4a7
        #7 transferring context: 93B 0.0s done
        #7 DONE 0.3s

        #5 [2/6] WORKDIR /app
        #5 sha256:d1b750eace5cd5951ed68c0ddcc139f3b08b2c1a7caadf168aa8358466959831
        #5 CACHED

        #6 [3/6] RUN apk add --no-cache gcc musl-dev linux-headers
        #6 sha256:5021bf6f279bfb6b4d5e97232f76c67fc3380b3c57ec2fc1187c5855b8c096c8
        #6 CACHED

        #8 [4/6] COPY requirements.txt requirements.txt
        #8 sha256:cc1abd5e4d0068f66e4acf35c48596aa7a0d2214f55761200550fe6f1ba89ad1
        #8 CACHED

        #9 [5/6] RUN pip install -r requirements.txt
        #9 sha256:7c760bbd3f91d20855bb6cfed827058a5b0e25810ba22bcd123df77b5853d1bb
        #9 CACHED

        #10 [6/6] COPY . .
        #10 sha256:80220a4a8aa319cee5020591a6c257723fcfa0d89b36b2381ed1773922f72390
        #10 CACHED

        #11 exporting to image
        #11 sha256:e8c613e07b0b7ff33893b694f7759a10d42e180f2b4dc349fb57dc6b71dcab00
        #11 exporting layers done
        #11 writing image sha256:b42f2096a1a267bba6319e8e47287d616533a811a058714f9e5fb4c4256351d6
        #11 writing image sha256:b42f2096a1a267bba6319e8e47287d616533a811a058714f9e5fb4c4256351d6 0.0s done
        #11 naming to docker.io/library/app done
        #11 DONE 0.4s

    Outputs:
        url: "http://localhost:5000"

    Resources:
        + 6 created

    Duration: 23s
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
