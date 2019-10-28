module Program

open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.Appservice
open Pulumi.Azure.Appservice.Inputs
open Pulumi.Azure.Core
open Pulumi.Azure.Sql
open Pulumi.Azure.Storage
open Pulumi.Azure.Storage.Inputs
open System.Collections.Immutable

let signedBlobReadUrl(blob: ZipBlob) (account: Account): Output<string> =
    let getSasToken (values: ImmutableArray<string>) =
        async {
            let accountName = values.[0]
            let connectionString = values.[1]
            let containerName = values.[2]
            let blobName = values.[3]
            let permissions = 
                new GetAccountBlobContainerSASPermissionsArgs
                   (Read = input true, Write = input false, Delete = input false,
                    List = input false, Add = input false, Create = input false)
            let args = 
                new GetAccountBlobContainerSASArgs
                   (ConnectionString = input connectionString,
                    ContainerName = input containerName,
                    Start = input "2019-01-01",
                    Expiry = input "2100-01-01",
                    Permissions = input permissions)
            let! sas = Invokes.GetAccountBlobContainerSAS args |> Async.AwaitTask
            return sprintf "https://%s.blob.core.windows.net/%s/%s%s" accountName containerName blobName sas.Sas
        }
        |> Async.StartAsTask

    Output.All(io account.Name, io account.PrimaryConnectionString, io blob.StorageContainerName, io blob.Name)
          .Apply<string> getSasToken

let infra () =
    let resourceGroup = new ResourceGroup "appservice-rg"

    let storageAccount =
        new Account("sa",
            new AccountArgs
               (ResourceGroupName = io resourceGroup.Name,
                AccountReplicationType = input "LRS",
                AccountTier = input "Standard"))

    let sku = new PlanSkuArgs(Tier = input "Basic", Size = input "B1")
    let appServicePlan = 
        new Plan("asp", 
            new PlanArgs
               (ResourceGroupName = io resourceGroup.Name,
                Kind = input "App",
                Sku = input sku))

    let container = 
        new Container("zips", 
            new ContainerArgs
               (StorageAccountName = io storageAccount.Name,
                ContainerAccessType = input "private"))

    let archive = new FileArchive("wwwroot") :> Archive
    let blob =
        new ZipBlob("zip", 
            new ZipBlobArgs
               (StorageAccountName = io storageAccount.Name,
                StorageContainerName = io container.Name,
                Type = input "block",
                Content = input archive))

    let codeBlobUrl = signedBlobReadUrl blob storageAccount

    let config = new Config()
    let username = config.Get "sqlAdmin"
    let password = config.RequireSecret "sqlPassword"
    let sqlServer = 
        new SqlServer("sql", 
            new SqlServerArgs
               (ResourceGroupName = io resourceGroup.Name,
                AdministratorLogin = input (if username <> null then username else "pulumi"),
                AdministratorLoginPassword = io password,
                Version = input "12.0"))

    let database =
        new Database("db",
            new DatabaseArgs
               (ResourceGroupName = io resourceGroup.Name,
                ServerName = io sqlServer.Name,
                RequestedServiceObjectiveName = input "S0"))

    let connectionString = 
        Output
            .Tuple<string, string, string>(io sqlServer.Name, io database.Name, io password)
            .Apply<string>(
                fun struct(server, database, pwd) -> 
                    sprintf
                        "Server= tcp:%s.database.windows.net;initial catalog=%s;userID=%s;password=%s;Min Pool Size=0;Max Pool Size=30;Persist Security Info=true;"
                        server database username pwd)

    let connectionStringSetting =
        new AppServiceConnectionStringsArgs
           (Name = input "db",
            Type = input "SQLAzure",
            Value = io connectionString)

    let appSettings = new InputMap<string> ()
    appSettings.Add("WEBSITE_RUN_FROM_PACKAGE", io codeBlobUrl)
    let connectionStrings = new InputList<AppServiceConnectionStringsArgs> ()
    connectionStrings.Add (input connectionStringSetting)
    let app = 
        new AppService("app", 
            new AppServiceArgs
               (ResourceGroupName = io resourceGroup.Name,
                AppServicePlanId = io appServicePlan.Id,
                AppSettings = appSettings,
                ConnectionStrings = connectionStrings))

    dict [("endpoint", app.DefaultSiteHostname :> obj)]

[<EntryPoint>]
let main _ =
  Deployment.run infra
