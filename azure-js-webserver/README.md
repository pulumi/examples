# Pulumi web server (Azure)

Starting point for building the Pulumi web server sample in Azure.

## Running the App

Create a new stack:

```
$ pulumi stack init --local
Enter a stack name: testing
```

Configure the app deployment.  The username and password here will be used to configure the Virtual Machine.  The
password must adhere to the [Azure restrictions on VM
passwords](https://docs.microsoft.com/en-us/azure/virtual-machines/windows/faq#what-are-the-password-requirements-when-creating-a-vm).

```
$ pulumi config set azure:environment public
$ pulumi config set username testuser
$ pulumi config set --secret password <yourpassword>
```

Login to Azure CLI (you will be prompted to do this during deployment if you forget):

```
$ az login
```

Restore NPM dependencies:

```
$ npm install
```

Preview the deployment of the application:

``` 
$ pulumi preview
Previewing changes:
[...details omitted...]
info: 7 changes previewed:
    + 7 resources to create
```

Perform the deployment:

```
$ pulumi update
Performing changes:
[...details omitted...]
info: 7 changes performed:
    + 7 resources created
Update duration: 2m38.391208237s
```

Check the IP address:

```
$ pulumi stack output privateIP
10.0.2.4
```

*TODO*: Expose the Public IP address as well so that the VM can be SSH'd into or CURL'd directly.
