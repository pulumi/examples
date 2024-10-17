module Program

open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.AppInsights
open Pulumi.Azure.AppService
open Pulumi.Azure.AppService.Inputs
open Pulumi.Azure.Core
open Pulumi.Azure.MSSql
open Pulumi.Azure.Storage

let infra () =
    let resourceGroup = ResourceGroup "appservice-rg"

    let storageAccount =
        Account("sa",
            AccountArgs
               (ResourceGroupName = io resourceGroup.Name,
                AccountReplicationType = input "LRS",
                AccountTier = input "Standard"))

    let appServicePlan = 
        ServicePlan("asp", 
            ServicePlanArgs
               (ResourceGroupName = io resourceGroup.Name,
                OsType = input "Linux",
                SkuName = input "B1"))

    let container = 
        Container("zips", 
            ContainerArgs
               (StorageAccountName = io storageAccount.Name,
                ContainerAccessType = input "private"))

    let archive = FileArchive("wwwroot") :> AssetOrArchive
    let blob =
        Blob("zip", 
            BlobArgs
               (StorageAccountName = io storageAccount.Name,
                StorageContainerName = io container.Name,
                Type = input "Block",
                Source = input archive))

    let codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount)

    let appInsights = 
        Insights("appInsights", 
            InsightsArgs
                (ApplicationType = input "web",
                 ResourceGroupName = io resourceGroup.Name))

    let config = Config()
    let username = config.Get "sqlAdmin"
    let password = config.RequireSecret "sqlPassword"
    let sqlServer = 
        Server("sql", 
            ServerArgs
               (ResourceGroupName = io resourceGroup.Name,
                AdministratorLogin = input (if not(isNull username) then username else "pulumi"),
                AdministratorLoginPassword = io password,
                Version = input "12.0"))

    let database =
        Database("db",
            DatabaseArgs
               (ServerId = io sqlServer.Id,
                SkuName = input "S0"))

    let connectionString = 
        Outputs.pair3 sqlServer.Name database.Name password
        |> Outputs.apply(fun (server, database, pwd) -> 
            sprintf
                "Server= tcp:%s.database.windows.net;initial catalog=%s;userID=%s;password=%s;Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;"
                server database username pwd)

    let connectionStringSetting =
        LinuxWebAppConnectionStringArgs
           (Name = input "db",
            Type = input "SQLAzure",
            Value = io connectionString)
            
    let appInsightsConnectionString =
        appInsights.InstrumentationKey
        |> Outputs.apply(fun (key) ->
            sprintf "InstrumentationKey=%s" key)

    let app = 
        LinuxWebApp("app", 
            LinuxWebAppArgs
               (ResourceGroupName = io resourceGroup.Name,
                ServicePlanId = io appServicePlan.Id,
                AppSettings = inputMap 
                    ["WEBSITE_RUN_FROM_PACKAGE", io codeBlobUrl;
                    "APPINSIGHTS_INSTRUMENTATIONKEY", io appInsights.InstrumentationKey;
                    "APPLICATIONINSIGHTS_CONNECTION_STRING", io appInsightsConnectionString;
                    "ApplicationInsightsAgent_EXTENSION_VERSION", input "~2"],
                SiteConfig = LinuxWebAppSiteConfigArgs(),
                ConnectionStrings = inputList [input connectionStringSetting]))

    dict [("endpoint", app.DefaultHostname :> obj)]

[<EntryPoint>]
let main _ =
  Deployment.run infra
