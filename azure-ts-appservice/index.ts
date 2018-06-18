import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";
import { signedBlobReadUrl } from "./sas";

const name = 'azpulumi';

const resourceGroup = new azure.core.ResourceGroup(`${name}-rg`, {
        location: "West US 2",
    });

const resourceGroupArgs = {
    resourceGroupName: resourceGroup.name,
    location: resourceGroup.location,
};

const storageAccount = new azure.storage.Account(`${name}sa`, {
    ...resourceGroupArgs,

    accountKind: "StorageV2",
    accountTier: "Standard",
    accountReplicationType: "LRS",
});


const appServicePlan = new azure.appservice.Plan(`${name}-asp`, {
    ...resourceGroupArgs,

    kind: "App",

    sku: {
        tier: "Basic",
        size: "B1",
    },
});

const storageContainer = new azure.storage.Container(`${name}-c`, {
    resourceGroupName: resourceGroup.name,
    storageAccountName: storageAccount.name,
    containerAccessType: "private",
});

const map: pulumi.asset.AssetMap = {};
map["index.html"] = new pulumi.asset.StringAsset("<html><body><h1>Greetings from Azure App Service!</h1></body></html>");

const blob = new azure.storage.ZipBlob(`${name}-b`, {
    resourceGroupName: resourceGroup.name,
    storageAccountName: storageAccount.name,
    storageContainerName: storageContainer.name,
    type: "block",

    content: new pulumi.asset.AssetArchive(map)
             // to pack a folder use new pulumi.asset.FileArchive("folder")
});

const codeBlobUrl = signedBlobReadUrl(blob, storageAccount, storageContainer);

const appInsights = new azure.appinsights.Insights(`${name}-ai`, {
    ...resourceGroupArgs,

    applicationType: "Web"
});

const username = "pulumi";

// Get the password to use for SQL from config.
const config = new pulumi.Config(name);
const pwd = config.require("sqlPassword"); 

const sqlServer = new azure.sql.SqlServer(`${name}-sql`, {
    ...resourceGroupArgs,

    administratorLogin: username,
    administratorLoginPassword: pwd,
    version: "12.0", 
});

const database = new azure.sql.Database(`${name}-db`, {
    ...resourceGroupArgs,
    serverName: sqlServer.name,
    requestedServiceObjectiveName: "S0"
});

const app = new azure.appservice.AppService(`${name}-as`, {
    ...resourceGroupArgs,

    appServicePlanId: appServicePlan.id,


    appSettings: {
        "WEBSITE_RUN_FROM_ZIP": codeBlobUrl,
        "ApplicationInsights:InstrumentationKey": appInsights.instrumentationKey,
        "APPINSIGHTS_INSTRUMENTATIONKEY": appInsights.instrumentationKey
    },

    connectionStrings: [{
        name: "db",
        value: sqlServer.name.apply(
            server => database.name.apply(
                db => `Server=tcp:${server}.database.windows.net;initial catalog=${db};user ID=${username};password=${pwd};Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;`)),
        type: "SQLAzure"
    }]    
});

exports.endpoint = app.defaultSiteHostname.apply(n => `https://${n}`);