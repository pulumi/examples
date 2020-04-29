[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# AWS Resources

A Pulumi program that demonstrates creating various AWS resources in Python

```bash
# Create and configure a new stack
$ pulumi stack init dev
$ pulumi config set aws:region us-east-2

# Install dependencies
$ python3 -m venv venv
$ source venv/bin/activate
$ pip3 install -r requirements.txt

# Preview and run the deployment
$ pulumi up

# Remove the app
$ pulumi destroy
$ pulumi stack rm
```
