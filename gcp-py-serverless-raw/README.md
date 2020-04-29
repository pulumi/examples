[![Deploy](https://get.pulumi.com/new/button.svg)](https://app.pulumi.com/new)

# Google Cloud Functions in Python and Go deployed

This example deploys two Google Cloud Functions. "Hello World" functions are implemented in Python and Go. Pulumi program is implemented in Python.

```bash
# Create and configure a new stack
$ pulumi stack init testing
$ pulumi config set gcp:project <your-gcp-project>
$ pulumi config set gcp:region <gcp-region>

# This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

$ python3 -m venv venv
$ source venv/bin/activate
$ pip3 install -r requirements.txt

# Preview and run the deployment
$ pulumi up
Previewing changes:
...
Performing changes:
...
info: 6 changes performed:
    + 6 resources created
Update duration: 1m14s

# Test it out
$ curl $(pulumi stack output python_endpoint)
"Hello World!"
$ curl $(pulumi stack output go_endpoint)
"Hello World!"

# Remove the app
$ pulumi destroy
```
