# F5 BigIP Local Traffic Manager

This example demonstrates use of the [Pulumi F5 BigIP Provider](https://github.com/pulumi/pulumi-f5bigip)
to provide load balancing via an F5 BigIP appliance to backend HTTP instances. The example provisions:

* an LTM Monitor with a Send String value of `GET /`
* an LTM Pool using the LTM Monitor
* _N_ number of LTM Pool Attachments based on provided backend addresses
* an LTM Virtual Server

All of these happen behind a single `pulumi up` command, and are expressed in just a handful of TypeScript.

# Prerequisites

Ensure you have [downloaded and installed the Pulumi CLI](https://www.pulumi.com/docs/get-started/install/).

If you **_already_** have an F5 BigIP appliance available, you only need administrative credentials to it and
at least one backend HTTP instance to load balance to.

If you **_do not_** already have an F5 BigIP appliance available, you can use the example in [f5bigip-ec2-instance](./f5bigip-ec2-instance) to deploy an F5 BigIP instance on AWS using an F5 BigIP AMI from the AWS Marketplace.
Note: you must first subscribe to the AWS Marketplace product [here](https://aws.amazon.com/marketplace/pp/B079C44MFH?qid=1546534998240&sr=0-13).

If you _do not_ already have backend HTTP instance available, you can use the example in [nginx-ec2-instance](./nginx-ec2-instance) to deploy multiple NGINX instances on AWS and use them as members of the LTM Pool as
Pool Attachments.

# Running the Example

If you need to deploy an F5 BigIP appliance or backend HTTP instances as described above, first [Configure Pulumi for AWS](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/).

## (Optional) Provision an F5 BigIP appliance on AWS

1. Change directory to `f5bigip-ec2-instance`.

    ```bash
    $ cd f5bigip-ec2-instance
    ````

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init f5bigip-ec2-instance-dev
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-west-2    # any valid AWS zone works
    $ pulumi config set f5BigIpAdminPassword --secret [your-new-bigip-password-here]
    ```

1. Deploy everything with the `pulumi up` command. This provisions the necessary AWS resources, primarily a
VPC Security group and EC2 Instance, in a single gesture:

    ```bash
    $ pulumi up
    ```

   This will show you a preview, ask for confirmation, and then begin provisioning your resources:

    ```
    Updating (f5bigip-ec2-instance-dev):

    Type                      Name                                           Status
    +   pulumi:pulumi:Stack       f5bigip-ec2-instance-f5bigip-ec2-instance-dev  created
    +   ├─ aws:ec2:SecurityGroup  bigIp                                          created
    +   └─ aws:ec2:Instance       bigIp                                          created

    Outputs:
        f5Address  : "https://34.210.83.227:8443"
        f5PrivateIp: "172.31.42.112"

    Resources:
        + 3 created

    Duration: 40s
    ```

   After this completes, numerous outputs will show up. `f5Address` and `f5PrivateIp` are values you will use in the
   `f5bigip-pool` example later on.

## (Optional) Provision Backend NGINX Instances

1. Change directory to `nginx-ec2-instance`.

    ```bash
    $ cd nginx-ec2-instance
    ````

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init nginx-ec2-instance-dev
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set aws:region us-west-2    # any valid AWS zone works
    ```

1. Deploy everything with the `pulumi up` command. This provisions a VPC security group allowing access to
NGINX from anywhere and three EC2 Instances running NGINX:

    ```bash
    $ pulumi up
    ```

   This will show you a preview, ask for confirmation, and then begin provisioning your resources:

    ```
    Updating (nginx-ec2-instance-dev):

        Type                      Name                                        Status
    +   pulumi:pulumi:Stack       nginx-ec2-instance/-nginx-ec2-instance-dev  created
    +   ├─ aws:ec2:SecurityGroup  nginx                                       created
    +   ├─ aws:ec2:Instance       nginx-2                                     created
    +   ├─ aws:ec2:Instance       nginx-1                                     created
    +   └─ aws:ec2:Instance       nginx-0                                     created

    Outputs:
        instancePublicIps: [
            [0]: "52.35.179.187"
            [1]: "34.213.179.46"
            [2]: "54.184.63.40"
        ]

    Resources:
        + 5 created

    Duration: 44s
    ```

   After this completes, a single output with multiple values will display. `instancePublicIps` are the IP addresses
   you will use to provide load balancing _to_ in the `f5bigip-pool` example.

## Provision F5 BigIP Application Pool Resources

1. Change directory to `f5bigip-pool`.

    ```bash
    $ cd f5bigip-pool
    ````

1. Create a new stack, which is an isolated deployment target for this example:

    ```bash
    $ pulumi stack init f5bigip-pool-dev
    ```

1. Set the required configuration variables for this program:

    ```bash
    $ pulumi config set f5bigip:address <f5Address>    # the address of your BigIP appliance - i.e. https://10.10.10.200:8443
    $ pulumi config set f5bigip:username admin
    $ pulumi config set f5bigip:password <f5Password>    # the 'admin' password of your BigIP appliance
    $ pulumi config set f5bigip-pool:backendInstances <address1:port,address2:port,...> #    Comma-delimited list of IP addresses with ports to load balance - i.e. '10.0.0.10:80,10.0.0.11:80,10.0.0.12:80'
    $ pulumi config set f5bigip-pool:f5BigIpPrivateIp <f5PrivateIp>    # the Private IP address of your BigIP appliance
    ```

1. Deploy everything with the `pulumi up` command. This provisions F5 BigIP LTM resources - application monitor,
application pool, pool attachments, and virtual server:

    ```bash
    $ pulumi up
    ```

   This will show you a preview, ask for confirmation, and then begin provisioning your resources:

    ```
    Updating (f5bigip-pool-dev):

        Type                           Name                           Status
    +   pulumi:pulumi:Stack            f5bigip-pool-f5bigip-pool-dev  created
    +   ├─ f5bigip:ltm:Monitor         backend                        created
    +   ├─ f5bigip:ltm:Pool            backend                        created
    +   ├─ f5bigip:ltm:VirtualServer   backend                        created
    +   ├─ f5bigip:ltm:PoolAttachment  backend-0                      created
    +   ├─ f5bigip:ltm:PoolAttachment  backend-2                      created
    +   └─ f5bigip:ltm:PoolAttachment  backend-1                      created

    Resources:
        + 7 created

    Duration: 3s
    ```

   After this completes, a single output with multiple values will display. `instancePublicIps` are the IP addresses
   you will use to provide load balancing _to_ in the `f5bigip-pool` example.

## Clean Up

1. Once you are done, you can destroy all of the resources, and the stack. Repeat this in each directory for each
of the examples from above that you ran `pulumi up` within.

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
