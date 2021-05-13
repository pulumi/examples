import pulumi
from pulumi_azure_native import resources
from pulumi_azure_native import storage
from pulumi_azure_native import web
from pulumi import Output

# Create an Azure Resource Group
resource_group = resources.ResourceGroup('resourcegroup_functions_py')

# Create a Storage Account
account = storage.StorageAccount('storageaccount',
    resource_group_name=resource_group.name,
    sku=storage.SkuArgs(name=storage.SkuName.STANDARD_LRS,),
    kind=storage.Kind.STORAGE_V2)

# Create a consumption plan
# Consumption plan must be linux for python: https://docs.microsoft.com/en-us/azure/azure-functions/functions-scale#operating-systemruntime
plan = web.AppServicePlan("consumption-plan",
    resource_group_name=resource_group.name,
    location=resource_group.location,
    kind = "functionapp",
    reserved=True, # This is an Azure Requirement for PYTHON. The function can only run on Linux. 
    sku=web.SkuDescriptionArgs(
        name="Y1",
        tier="Dynamic",
        size="Y1",
        family="Y",
        capacity=0
    )
)

# Export the Azure Resource Group
pulumi.export('resourcegroup', resource_group.name)

# Export the Storage Account
pulumi.export('storageaccount', account.name)

# Export the Consumption Plan
pulumi.export('consumptionplan', plan.name)

# List of storage account keys
storageAccountKeys = pulumi.Output.all(resource_group.name, account.name).apply(lambda args:  storage.list_storage_account_keys(resource_group_name=args[0],account_name=args[1]))
# Primary storage account key
primaryStorageKey = storageAccountKeys.apply(lambda accountKeys: accountKeys.keys[0].value)
# Build a storage connection string out of it:
storageConnectionString = Output.concat("DefaultEndpointsProtocol=https;AccountName=",account.name,";AccountKey=",primaryStorageKey)


# Export the storageacountkey as a secret
pulumi.export("storageaccountkeys", pulumi.Output.secret(storageAccountKeys))
# Export the primarystoragekey as a secret
pulumi.export('primarystoragekey',  pulumi.Output.secret(primaryStorageKey )) 
# Export the storageconnectionstring  as a secret
pulumi.export('storageconnectionstring', pulumi.Output.secret(storageConnectionString))

# Create the functionapp
app = web.WebApp("functionapp", 
    resource_group_name=resource_group.name,
    location=resource_group.location,
    kind="functionapp",
    reserved=True,
    server_farm_id=plan.id,
        site_config=web.SiteConfigArgs(
        app_settings=[
            web.NameValuePairArgs(name = "runtime", value="python"),
            web.NameValuePairArgs(name = "FUNCTIONS_WORKER_RUNTIME", value ="python"),
            web.NameValuePairArgs(name = "FUNCTIONS_EXTENSION_VERSION", value="~3"),
            web.NameValuePairArgs(name = "AzureWebJobsStorage", value=storageConnectionString),
            web.NameValuePairArgs(name=  "WEBSITE_RUN_FROM_PACKAGE", value="https://github.com/tusharshahrs/demo/raw/main/content/lab/pulumi/azure-native/python/app/HelloWithPython.zip"),
        ],
    )
)

# Export the function
pulumi.export('function_app', app.name)

# Full endpoint of your Function App
function_endpoint = app.default_host_name.apply(lambda default_host_name: f"https://{default_host_name}/api/HelloWithPython")
pulumi.export('endpoint', function_endpoint)