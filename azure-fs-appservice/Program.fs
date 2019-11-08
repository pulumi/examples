module Program

open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.AppService
open Pulumi.Azure.AppService.Inputs
open Pulumi.Azure.Core
open Pulumi.Azure.Sql
open Pulumi.Azure.Storage
open Pulumi.Azure.Storage.Inputs

module Outputs =
    
    let apply<'a, 'b> (f: 'a -> 'b) (output: Output<'a>) : Output<'b> =
        output.Apply f

    let applyAsync<'a, 'b> (f: 'a -> Async<'b>) (output: Output<'a>) : Output<'b> =
        output.Apply<'b> (f >> Async.StartAsTask)

    let bind<'a, 'b> (f: 'a -> Output<'b>) (output: Output<'a>) : Output<'b> =
        output.Apply<'b> f
    
    let pair<'a, 'b> (a: Output<'a>) (b: Output<'b>) =
        Output.Tuple (a, b) 
        |> apply (fun struct (a, b) -> (a, b))

    let pair3<'a, 'b, 'c> (a: Output<'a>) (b: Output<'b>) (c: Output<'c>) =
        Output.Tuple (io a, io b, io c) 
        |> apply (fun struct (a,b,c) -> (a,b,c))

    let pair4<'a, 'b, 'c, 'd> (a: Output<'a>) (b: Output<'b>) (c: Output<'c>) (d: Output<'d>) =
        pair (pair a b) (pair c d)
        |> apply(fun ((e, f), (g, h)) -> e, f, g, h)

    let all<'a> (values: List<Output<'a>>) : Output<List<'a>> = 
        Output.All (values |> List.map io |> List.toArray)
        |> apply List.ofSeq

let inputList<'a> (items: seq<Input<'a>>) =
    let result = new InputList<'a> ()
    for item in items do result.Add item
    result

let inputMap<'a> (items: seq<string * Input<'a>>) =
    let result = new InputMap<'a> ()
    for item in items do result.Add item
    result

let signedBlobReadUrl(blob: ZipBlob) (account: Account): Output<string> =
    let getSasToken (accountName, connectionString, containerName, blobName) = async {
        let permissions = 
            GetAccountBlobContainerSASPermissionsArgs
                (Read = input true, Write = input false, Delete = input false,
                List = input false, Add = input false, Create = input false)
        let args = 
            GetAccountBlobContainerSASArgs
                (ConnectionString = input connectionString,
                ContainerName = input containerName,
                Start = input "2019-01-01",
                Expiry = input "2100-01-01",
                Permissions = input permissions)
        let! sas = Invokes.GetAccountBlobContainerSAS args |> Async.AwaitTask
        return sprintf "https://%s.blob.core.windows.net/%s/%s%s" accountName containerName blobName sas.Sas
    }

    Outputs.pair4 account.Name account.PrimaryConnectionString blob.StorageContainerName blob.Name
    |> Outputs.applyAsync getSasToken

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

    let codeBlobUrl = signedBlobReadUrl blob storageAccount

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
