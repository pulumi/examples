// Copyright 2016-2020, Pulumi Corporation

namespace UnitTesting

open System.IO
open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.Core
open Pulumi.Azure.Storage
open Pulumi.Azure.Storage.Inputs

type WebsiteStack() =
    inherit Stack()
    
    let resourceGroup =
        new ResourceGroup(
            "www-prod-rg",
            new ResourceGroupArgs(Tags = inputMap(["Environment", input "production"])))

    let storageAccount =
        new Account(
            "wwwprodsa",
            new AccountArgs(
                ResourceGroupName = io resourceGroup.Name,
                AccountTier = input "Standard",
                AccountReplicationType = input "LRS",
                StaticWebsite = input (new AccountStaticWebsiteArgs(IndexDocument = input "index.html"))))
    
    let files =
        let fileNames = Directory.GetFiles("wwwroot")
        fileNames
        |> Seq.map(fun file ->
            new Blob(
                file,
                new BlobArgs(
                    ContentType = input "application/html",
                    Source = input (new FileAsset(file) :> AssetOrArchive),
                    StorageAccountName = io storageAccount.Name,
                    StorageContainerName = input "$web",
                    Type = input "Block")))
        |> List.ofSeq
        
    [<Output>]
    member val Endpoint = storageAccount.PrimaryWebEndpoint with get, set
