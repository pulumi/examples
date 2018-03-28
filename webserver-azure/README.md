# Pulumi web server (Azure)

Starting point for building the Pulumi web server sample in Azure.

## Running the App

Create a new stack:

```
$ pulumi stack init --local
Enter a stack name: testing
```

Configure the app deployment:

```
$ pulumi config set azure:environment public
$ pulumi config set username testuser
$ pulumi config set --secret password <yourpassword>
```

Login to Azure CLI (you will be prompted to do this during deployment if you forget):

```
$ az login
```

Preview the deployment of the application:

``` 
$ pulumi preview
Previewing changes:
[76 lines elided...]
info: 7 changes previewed:
    + 7 resources to create
```

Perform the deployment:

```
$ pulumi update
Performing changes:
[135 lines elided...]
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
