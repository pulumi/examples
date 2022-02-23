[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-py-resources/README.md)

# AWS Resources

A Pulumi program that demonstrates creating various AWS resources in Python

```bash
# Create and configure a new stack
$ pulumi stack init dev
$ pulumi config set aws:region us-east-2

# Create a Python virtualenv, activate it, and install dependencies
$ python3 -m venv venv
$ source venv/bin/activate
$ pip install -r requirements.txt

# Preview and run the deployment
$ pulumi up

# Remove the app
$ pulumi destroy
$ pulumi stack rm
```
