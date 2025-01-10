# Deploying Serverless Applications with Azure Functions

You will deploy a Azure Function Apps with HTTP-triggered serverless functions in python

## Running the App

1.  Login to Azure CLI (you will be prompted to do this during deployment if you forget this step):

    ```
    $ az login
    ```

1.  Create a new stack:

    ```
    $ pulumi stack init dev
    ```


1. Create a virtual environment and install python dependencies

    ### Windows
    Run the following command to create a virtual environment
    ```bash
    python -m venv venv
    ```

    Activate the environment:
    ```bash
    venv\Scripts\activate
    ```

    Install dependencies:
    ```bash
    pip3 install -r requirements.txt
    ```
    ### Mac and Linux
    Run the following command to create a virtual environment
    ```bash
    python3 -m venv venv
    ```

    Activate the environment:
    ```bash
    source venv/bin/activate
    ```

    Install dependencies:
    ```bash
    pip3 install -r requirements.txt
    ```

    At this point, dependencies will be installed into your virtual environment. **If you close your terminal at any time**, you may need to re-activate the environment:
    ```bash
    source venv/bin/activate
    ```

1.  Configure the location to deploy the resources to.  The Azure region to deploy to is pre-set to **WestUS** - but you can modify the region you would like to deploy to.

    ```bash
    pulumi config set azure-native:location eastus2
    ```

    [pulumi config set](https://www.pulumi.com/docs/reference/cli/pulumi_config_set/) allows us to pass in [configuration values](https://www.pulumi.com/docs/intro/concepts/config/#setting-and-getting-configuration-values) from the command line.
    Feel free to choose any Azure region that supports the services used in these labs ([see this infographic](https://azure.microsoft.com/en-us/global-infrastructure/regions/) for current list of available regions).  A list of some of the regions:

    ```
    centralus,eastasia,southeastasia,eastus,eastus2,westus,westus2,northcentralus,southcentralus,
    westcentralus,northeurope,westeurope,japaneast,japanwest,brazilsouth,australiasoutheast,australiaeast,
    westindia,southindia,centralindia,canadacentral,canadaeast,uksouth,ukwest,koreacentral,koreasouth,
    francecentral,southafricanorth,uaenorth,australiacentral,switzerlandnorth,germanywestcentral,
    norwayeast,jioindiawest,australiacentral2
    ```

    The command updates and persists the value to the local `Pulumi.dev.yaml` file. You can view or edit this file at any time to effect the configuration of the current stack.

1. Azure Python Function Zip file
   The applications settings configure the app to run on Python3 deploy the specified zip file to the Function App. The app will download the specified file, extract the code from it, discover the functions, and run them. We’ve prepared this [zip](https://github.com/tusharshahrs/demo/blob/main/content/lab/pulumi/azure-native/python/app/HelloWithPython.zip) file for you to get started faster, you can find its code [here](https://github.com/tusharshahrs/demo/tree/main/content/lab/pulumi/azure-native/python/app). The code contains a single HTTP-triggered Azure Function.

1. Run `pulumi up` to preview and select `yes` to deploy changes:

    ```
    $ pulumi up
    Previewing update (dev)

    View Live: https://app.pulumi.com/myuser/azure-py-functions/dev/previews/f3ea-2esdff2-123d-e79d

        Type                                     Name                        Plan       
    +   pulumi:pulumi:Stack                      azure-py-functions-dev      create     
    +   ├─ azure-native:resources:ResourceGroup  resourcegroup_functions_py  create     
    +   ├─ azure-native:web:AppServicePlan       consumption-plan            create     
    +   ├─ azure-native:storage:StorageAccount   storageaccount              create     
    +   └─ azure-native:web:WebApp               functionapp                 create     
    
    Resources:
        + 5 to create

    Do you want to perform this update?  [Use arrows to move, enter to select, type to filter]
    > yes
      no
      details

    Updating (dev)

    View Live: https://app.pulumi.com/myuser/azure-py-functions/dev/updates/1

        Type                                     Name                        Status      
    +   pulumi:pulumi:Stack                      azure-py-functions-dev      created     
    +   ├─ azure-native:resources:ResourceGroup  resourcegroup_functions_py  created     
    +   ├─ azure-native:web:AppServicePlan       consumption-plan            created     
    +   ├─ azure-native:storage:StorageAccount   storageaccount              created     
    +   └─ azure-native:web:WebApp               functionapp                 created     
    
    Outputs:
        consumptionplan        : "consumption-plan7b9df5ed"
        endpoint               : "https://functionappfe054af4.azurewebsites.net/api/HelloWithPython"
        function_app           : "functionappfe054af4"
        primarystoragekey      : "[secret]"
        resourcegroup          : "resourcegroup_functions_py4eba2bf2"
        storageaccount         : "storageaccounta6b2e431"
        storageaccountkeys     : "[secret]"
        storageconnectionstring: "[secret]"

    Resources:
        + 5 created

    Duration: 50s
    ```

1.  Check the deployed function endpoints via [pulumi stack output](https://www.pulumi.com/docs/reference/cli/pulumi_stack_output/)

    ```
    $ pulumi stack output endpoint
      https://functionappfe054af4.azurewebsites.net/api/HelloWithPython

1. You can now open the resulting endpoint in the browser or curl it:
   ```
    $ curl "$(pulumi stack output endpoint)"
    Hello from Python in Pulumi! You have stood up a serverless function in Azure!
    ```

## Cleanup and destroy everything

1. Destroy the stack via: `pulumi destroy`   .Select `yes`
   ```
   Previewing destroy (dev)
    
        Type                                     Name                        Plan       
    -   pulumi:pulumi:Stack                      azure-py-functions-dev      delete     
    -   ├─ azure-native:web:WebApp               functionapp                 delete          
     ..
     ..  
    
    Outputs:
      - endpoint               : "https://functionappfe054af4.azurewebsites.net/api/HelloWithPython"
      ..
      ..

    Resources:
        - 5 to delete

    Do you want to perform this destroy?  [Use arrows to move, enter to select, type to filter]
      yes
    > no
      details
    ..
    ..
    Resources:
    - 5 deleted

    Duration: 1m1s  
   ```

1. Remove the stack

    ```
    pulumi stack rm
    This will permanently remove the 'dev' stack!
    Please confirm that this is what you'd like to do by typing ("dev"): 
    ```

    Type in the name of your stack:  **dev**