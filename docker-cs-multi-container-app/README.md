[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-cs-multi-container-app/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/docker-cs-multi-container-app/README.md#gh-dark-mode-only)

# Docker multi-container example

## Deploying the App

To deploy your infrastructure, follow the steps below.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Install Docker](https://docs.docker.com/engine/installation/) and have it running

## Running the App

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```

1.  Restore Nuget packages via `dotnet restore`.

1.  Preview and deploy the app via `pulumi up`. The preview will take a few minutes, as it builds a Docker container. A total of 19 resources are created.

    ```
    $ pulumi up
    ```

    ```
    Updating (dev)

    View Live: https://app.pulumi.com/acmecorp/docker-cs-multi-container-app/dev/updates/1

        Type                         Name                               Status
    +   pulumi:pulumi:Stack          docker-cs-multi-container-app-dev  created
    +   ├─ docker:image:Image        AppImage                           create
    +   ├─ docker:index:RemoteImage  RedisImage                         create
    +   ├─ docker:index:Network      network                            create
    +   ├─ docker:index:Container    RedisContainer                     create
    +   └─ docker:index:Container    AppContainer                       create

    Diagnostics:
    docker:image:Image (AppImage):
        warning: #1 [internal] load build definition from Dockerfile#1 sha256:2a9b9ce1c6c7a13dd62e06b1e5c1aa85080da181f4cbfddeb6dd474a63d7c606#1 transferring dockerfile: 37B done#1 DONE 0.4s#2 [internal] load .dockerignore#2 sha256:5f564042fd4d85d268067f7d297d69f219971e55ed723f2487806ba4934ae35f#2 transferring context: 2B done#2 DONE 0.6s#4 [internal] load metadata for mcr.microsoft.com/dotnet/sdk:5.0#4 sha256:f9541e65151d9de1e3f5d68829cd8cc3defacb0e940b12af587e2bb43b9d95ff#4 DONE 0.2s#3 [internal] load metadata for mcr.microsoft.com/dotnet/aspnet:5.0#3 sha256:3b35130338ebb888f84ec0aa58f64d182f10a676a625072200f5903996d93690#3 DONE 0.3s#7 [build 1/6] FROM mcr.microsoft.com/dotnet/sdk:5.0@sha256:fa19559201c43bc8191c1a095670e242de80a23697d24f5a3460019958637c63#7 sha256:a78f180b26c187173ce72c04a41454a864b07f1c578b98366c363c823bcf920e#7 DONE 0.0s#9 [internal] load build context#9 sha256:d41f2745e0db96afb0603c0a7e65c8cbdcad5f61a6c1ecc508011965b60e407f#9 transferring context: 6.13kB 0.0s done#9 ...#5 [stage-1 1/3] FROM mcr.microsoft.com/dotnet/aspnet:5.0@sha256:1d75db770c7ce82b128744770271bd87dc9d119f0ef15b94cab0f84477abfaec#5 sha256:41695b46732f62acab4a09819be3290689a1f9ab564027c8c6f3b253b2c5c037#5 resolve mcr.microsoft.com/dotnet/aspnet:5.0@sha256:1d75db770c7ce82b128744770271bd87dc9d119f0ef15b94cab0f84477abfaec 0.2s done#5 DONE 0.2s#9 [internal] load build context#9 sha256:d41f2745e0db96afb0603c0a7e65c8cbdcad5f61a6c1ecc508011965b60e407f#9 DONE 0.4s#6 [stage-1 2/3] WORKDIR /app#6 sha256:27a72acfce1071e0132b0f9643f3d69079780d0beb500aee75042347cad3e978#6 CACHED#8 [build 2/6] WORKDIR /app#8 sha256:5396aeba606566a543adfe3a8046cc7e40fd726f4e8428d99a3046d8e76461b0#8 CACHED#10 [build 3/6] COPY *.csproj .#10 sha256:733ef08b5420adda83ecdf01062658bf2eef97e80799d93a0781b0610f96b21b#10 CACHED#11 [build 4/6] RUN dotnet restore#11 sha256:f0b92641af9a9b8e73abc79cc6e05515639d4ae55eea6a80c0b58b149f4f493e#11 CACHED#12 [build 5/6] COPY . .#12 sha256:6072dc4ab3fa451e5a3dbcf399be9b34862ffe9d2030c6443444ffba5827fb4c#12 CACHED#13 [build 6/6] RUN dotnet publish -c Debug -o out#13 sha256:ed8ff670b44d091f44df69a8a8ac84c627dcad2c20e8b5339bcba6828654803d#13 CACHED#14 [stage-1 3/3] COPY --from=build /app/out .#14 sha256:072309ef8f92af6ddfb7aa96772289354b90ac91103e912182f033329e865844#14 CACHED#15 exporting to image#15 sha256:e8c613e07b0b7ff33893b694f7759a10d42e180f2b4dc349fb57dc6b71dcab00#15 exporting layers done#15 writing image sha256:9ab0b93d5db3fdf642d00f0a3b42042e4805a63df1780f4063fdbff760252ae0 0.0s done#15 naming to docker.io/library/app done#15 DONE 0.3s

    Outputs:
        Url: "http://localhost:8080/Cache"

    Resources:
        + 6 created

    Duration: 21s
    ```

1.  View the endpoint URL, and run curl:

    ```bash
    $ pulumi stack output
    Current stack outputs (1)
        OUTPUT                  VALUE
        url                http://localhost:3000

    $ curl $(pulumi stack output Url)
    I have been viewed 1 times
    ```

1. Repeat the previous command multiple times to see the number of views increase.

## Clean up

To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
