# AWS Golang Lambda
This example creates a lambda that does a simple `ToUpper` on the string input and returns it.

## Deploying the App

 To deploy your infrastructure, follow the below steps.

### Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Clone aws-go-lambda](https://github.com/aws/aws-lambda-go)

### Steps

After cloning this repo, run these commands from the working directory:

1. Build the go files:

```bash
make build
```

2. Create a new Pulumi stack, which is an isolated deployment target for this example:

```bash
pulumi stack init
```

3. Set the required configuration variables for this program:
```bash
pulumi config set aws:region us-east-1
```

4. Execute the Pulumi program to create our lambda:

```bash
pulumi up
```

5. Call our lambda function from the aws cli

```bash
aws lambda invoke \
--function-name $(pulumi stack output lambda) \
--region $(pulumi config get aws:region) \
--payload '"foo"' \
output.json

cat output.json # view the output file with your tool of choice
# "FOO"
```

6. From there, feel free to experiment. Simply making edits and running `make build` then `pulumi up` will update your lambda.

7. Afterwards, destroy your stack and remove it:

```bash
pulumi destroy --yes
pulumi stack rm --yes
```