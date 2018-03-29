# Pulumi web server with availability zones

Pulumi example that deploys multiple EC2 instances, one in each availability zone for the region. The example uses `aws.getAvailabilityZones()` which calls an an AWS API to retrieve all availability zones for the selected region. The program then loops over these AZs and creates an EC2 instance in each zone.

This example shows how to use dynamic data when deploying infrastructure. 

## Deploying and running the program

1. Run `pulumi init`. (Note: this command will not be required in a future SDK release.)

1. Create a new stack:

    ```
    $ pulumi stack init
    Enter a stack name: webserver-testing
    ```

1. Set the provider and region, such as `us-west-2`:

    ```
    $ pulumi config set cloud:provider aws
    $ pulumi config set aws:region us-west-2
    ```

1. Compile the program via `tsc` or `npm run build`.

1. Preview the program deployment:

    ```
    $ pulumi preview
    [... many lines elided ...]
    ---outputs:---
    serverUrls: [
        [0]: computed<string>
        [1]: computed<string>
        [2]: computed<string>
    ]
    info: 5 changes previewed:
        + 5 resources to create
    ```

1. Perform the deployment. Depending on the region you've selected, you should see two or three EC2 instances created.

    ```
    $ pulumi update
    [... many lines elided ...]
    ---outputs:---
    serverUrls: [
        [0]: "http://ec2-54-148-246-71.us-west-2.compute.amazonaws.com"
        [1]: "http://ec2-34-213-186-185.us-west-2.compute.amazonaws.com"
        [2]: "http://ec2-52-33-17-194.us-west-2.compute.amazonaws.com"
    ]
    info: 5 changes performed:
        + 5 resources created
    Update duration: 57.392733427s    
    ```

1. View the stack output:

    ```
    $ pulumi stack output serverUrls
    ["http://ec2-54-148-246-71.us-west-2.compute.amazonaws.com","http://ec2-34-213-186-185.us-west-2.compute.amazonaws.com","http://ec2-52-33-17-194.us-west-2.compute.amazonaws.com"]
    ```

1. Call `curl` on one of the endpoints:

    ```
    $ curl http://ec2-54-148-246-71.us-west-2.compute.amazonaws.com
    Hello, World!
    Instance metadata:
    us-west-2a
    ```

### Delete resources

When you're done, run `pulumi destroy` to delete the program's resources:

```
$ pulumi destroy
This will permanently destroy all resources in the 'webserver-testing' stack!
Please confirm that this is what you'd like to do by typing ("webserver-testing"): webserver-testing
```



