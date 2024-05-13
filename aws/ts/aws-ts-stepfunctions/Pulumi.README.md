[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# AWS Step Functions

A basic example that demonstrates using AWS Step Functions with a Lambda function.


# Start execution 

From the [console](https://console.aws.amazon.com/states/home?region=us-west-2#/statemachines/view/${outputs.stateMachineArn}).

Or from the AWS CLI:
```console
$ aws stepfunctions start-execution --state-machine-arn ${outputs.stateMachineArn}
```

