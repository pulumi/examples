# Static Web Using Amazon EC2, LoadBalancer

This examples deploys a constant number of EC2 instances, add each of these instances into a target group then create a application load balancer which listen to http request and then forward the request to the EC2 instances.

## What used in this repo

The language used to construct the infrastructure is Pulumi with Golang.

While AWS resources used in this project are:
- EC2
- AMI
- Load Balancer
- Listener
- Target Group
- Target Group Attachment
- Security Group
- VPC (Default)

## How does this work?

The code will get the `region` in the configuration, then base on this region it will fetch the `availability zone`

The code then will try to fetch `Default VPC` if it doesn't exist it will create a new one

Base on the `srvCount` the code will create number of resources:
- EC2 Instances
- Target Group Attachments

Then it will create the `load balancer` and add each `EC2 instance subnets` 

The `target group attachment` will attach each EC2 to the `target group` which will be put inside the `listener`

When user hit the `load balancer DNS` the `listener` will forward the request to the `load balancer` that will decide which EC2 instance will handle the request.

## Deploying the infrastucture

Follow these steps to deploy the infrastructure.

### Prerequisites
1. [Install Go](https://golang.org/doc/install)
2. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
3. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)

### Steps
1. After cloning this repo, from the working directory run these commands:
    ```bash
    $ pulumi stack init
    ```

2. Set the required configuration variable for this infrastructure (you can use your prefered region):
    ```bash
    $ pulumi config set aws:region ap-southeast-3
    ```

3. Configure the number of EC2 instances in `main.go` line 17:
    ```go
    const srvCount = 3
    ```

4. Do pulumi update:
    ```bash
    $ pulumi up
    ```

5. After few minutes, your infrastructure will be ready, check the `loadBalancer DNS` on the `terminal` to access the static web

6. Hit refresh to see if the load balancer working.

7. Feel free to experiment

8. Destroy your resources by:
    ```bash
    $ pulumi destroy
    ```