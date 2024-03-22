[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-ts-ecs/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-native-ts-ecs/README.md#gh-dark-mode-only)

# Create an ECS cluster on AWS with the AWS Native Provider

Create an ECS cluster, and deploy a task and service.

Note: Some resources are not yet supported by the Native AWS provider, so we are using both the Native
and Classic provider in this example. The resources will be updated to use native resources as they are
available in AWS's Cloud Control API.

## Deploying and running the program

Note: some values in this example will be different from run to run.  These values are indicated
with `***`.

1.  Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1.  Set the AWS region:

    Either using an environment variable
    ```bash
    $ export AWS_REGION=us-west-2
    ```

    Or with the stack config
    ```bash
    $ pulumi config set aws:region us-west-2
    $ pulumi config set aws-native:region us-west-2
    ```

1.  Restore NPM modules via `npm install` or `yarn install`.

1.  Run `pulumi up` to preview and deploy changes.  After the preview is shown you will be
    prompted if you want to continue or not.

    ```bash
    $ pulumi up
    Previewing update (dev)
    ...

    Updating (dev)

    View Live: https://app.pulumi.com/***/aws-native-ts-ecs/dev/updates/1

         Type                                           Name                   Status
    +   pulumi:pulumi:Stack                            aws-native-ts-ecs-dev  created
    +   ├─ aws:iam:Role                                task-exec-role         created
    +   ├─ aws-native:ecs:Cluster                      cluster                created
    +   ├─ aws:lb:TargetGroup                          app-tg                 created
    +   ├─ aws:ec2:SecurityGroup                       web-secgrp             created
    +   ├─ aws:iam:RolePolicyAttachment                task-exec-policy       created
    +   ├─ aws-native:ecs:TaskDefinition               app-task               created
    +   ├─ aws:lb:LoadBalancer                         app-lb                 created
    +   ├─ aws-native:elasticloadbalancingv2:Listener  web                    created
    +   └─ aws-native:ecs:Service                      app-svc                created

    Outputs:
    url: "app-lb-***.us-west-2.elb.amazonaws.com"

    Resources:
    + 10 created

    Duration: ***
    ```

1.  To see the resources that were created, run `pulumi stack output`:

    ```bash
    $ pulumi stack output
    Current stack outputs (1):
    OUTPUT  VALUE
    url     app-lb-***.us-west-2.elb.amazonaws.com
    ```

1.  Use curl to confirm that NGINX was deployed successfully:

    ```bash
    $ curl $(pulumi stack output url)
    <!DOCTYPE html>
    <html>
    <head>
    <title>Welcome to nginx!</title>
    <style>
    html { color-scheme: light dark; }
    body { width: 35em; margin: 0 auto;
    font-family: Tahoma, Verdana, Arial, sans-serif; }
    </style>
    </head>
    <body>
    <h1>Welcome to nginx!</h1>
    <p>If you see this page, the nginx web server is successfully installed and
    working. Further configuration is required.</p>

    <p>For online documentation and support please refer to
    <a href="http://nginx.org/">nginx.org</a>.<br/>
    Commercial support is available at
    <a href="http://nginx.com/">nginx.com</a>.</p>

    <p><em>Thank you for using nginx.</em></p>
    </body>
    </html>
    ```

1.  To clean up resources, run `pulumi destroy` and answer the confirmation question at the prompt.
