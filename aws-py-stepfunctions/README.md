[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-stepfunctions/README.md)

# AWS Step Functions

A basic example that demonstrates using AWS Step Functions with a Lambda function, written in Python.

```bash
# Create and configure a new stack
pulumi stack init stepfunctions-dev
pulumi config set aws:region us-east-2

# Create a Python virtualenv, activate it, and install dependencies
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt

# Preview and run the deployment
pulumi up

# Start execution using the AWS CLI (or from the console at https://console.aws.amazon.com/states)
aws stepfunctions start-execution --state-machine-arn $(pulumi stack output state_machine_arn)

# Remove the app and its stack
pulumi destroy && pulumi stack rm -y
```
