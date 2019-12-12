module Program

open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.AppService
open Pulumi.Azure.AppService.Inputs
open Pulumi.Azure.Core
open Pulumi.Azure.Sql
open Pulumi.Azure.Storage

let infra () =
    let resourceGroup = ResourceGroup "appservice-rg"

    let storageAccount =
        Account("sa",
            AccountArgs
               (ResourceGroupName = io resourceGroup.Name,
                AccountReplicationType = input "LRS",
                AccountTier = input "Standard"))

    let sku = PlanSkuArgs(Tier = input "Basic", Size = input "B1")
    let appServicePlan = 
        Plan("asp", 
            PlanArgs
               (ResourceGroupName = io resourceGroup.Name,
                Kind = input "App",
                Sku = input sku))

    let container = 
        Container("zips", 
            ContainerArgs
               (StorageAccountName = io storageAccount.Name,
                ContainerAccessType = input "private"))

    let archive = FileArchive("wwwroot") :> Archive
    let blob =
        ZipBlob("zip", 
            ZipBlobArgs
               (StorageAccountName = io storageAccount.Name,
                StorageContainerName = io container.Name,
                Type = input "block",
                Content = input archive))

    let codeBlobUrl = SharedAccessSignature.SignedBlobReadUrl(blob, storageAccount)

    let config = Config()
    let username = config.Get "sqlAdmin"
    let password = config.RequireSecret "sqlPassword"
    let sqlServer = 
        SqlServer("sql", 
            SqlServerArgs
               (ResourceGroupName = io resourceGroup.Name,
                AdministratorLogin = input (if not(isNull username) then username else "pulumi"),
                AdministratorLoginPassword = io password,
                Version = input "12.0"))

    let database =
        Database("db",
            DatabaseArgs
               (ResourceGroupName = io resourceGroup.Name,
                ServerName = io sqlServer.Name,
                RequestedServiceObjectiveName = input "S0"))

    let connectionString = 
        Outputs.pair3 sqlServer.Name database.Name password
        |> Outputs.apply(fun (server, database, pwd) -> 
            sprintf
                "Server= tcp:%s.database.windows.net;initial catalog=%s;userID=%s;password=%s;Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;"
                server database username pwd)

    let connectionStringSetting =
        AppServiceConnectionStringsArgs
           (Name = input "db",
            Type = input "SQLAzure",
            Value = io connectionString)

    let app = 
        AppService("app", 
            AppServiceArgs
               (ResourceGroupName = io resourceGroup.Name,
                AppServicePlanId = io appServicePlan.Id,
                AppSettings = inputMap ["WEBSITE_RUN_FROM_PACKAGE", io codeBlobUrl],
                ConnectionStrings = inputList [input connectionStringSetting]))

    dict [("endpoint", app.DefaultSiteHostname :> obj)]

[<EntryPoint>]
let main _ =
  Deployment.run infra
