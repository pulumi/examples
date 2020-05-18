// Copyright 2016-2020, Pulumi Corporation

namespace UnitTesting

open System
open System.Collections.Immutable
open System.Threading.Tasks
open NUnit.Framework
open Pulumi
open Pulumi.Azure.Core
open Pulumi.Azure.Storage
open Pulumi.Testing
open FluentAssertions

[<TestFixture>]
type WebserverStackTests() =
    let runTest(): ImmutableArray<Resource> =
        let options = new TestOptions(IsPreview = Nullable<bool> false)
        Deployment.TestAsync<WebsiteStack>(new Mocks(), options)
        |> Async.AwaitTask
        |> Async.RunSynchronously
        
    let getValue(output: Output<'a>): 'a =
        let tcs = new TaskCompletionSource<'a>()
        output.Apply(fun v -> tcs.SetResult(v); v) |> ignore
        tcs.Task.Result

    [<Test>]
    member this.SingleResourceGroupExists() =
        let resources = runTest()

        let resourceGroupCount = resources.OfType<ResourceGroup>() |> Seq.length
        resourceGroupCount.Should().Be(1, "a single resource group is expected") |> ignore    

    [<Test>]
    member this.ResourceGroupHasEnvironmentTag() =
        let resources = runTest()
        let resourceGroup = resources.OfType<ResourceGroup>() |> Seq.head

        let tags = getValue resourceGroup.Tags
        tags.Should().NotBeNull("Tags must be defined") |> ignore
        tags.Should().ContainKey("Environment", null) |> ignore

    [<Test>]
    member this.StorageAccountBelongsToResourceGroup() =
        let resources = runTest()
        let storageAccount = resources.OfType<Account>() |> Seq.tryHead |> Option.toObj
        storageAccount.Should().NotBeNull("Storage account not found") |> ignore
        
        let resourceGroupName = getValue storageAccount.ResourceGroupName
        resourceGroupName.Should().Be("www-prod-rg", null) |> ignore

    [<Test>]
    member this.UploadsTwoFiles() =
        let resources = runTest()
        let filesCount = resources.OfType<Blob>() |> Seq.length
        filesCount.Should().Be(2, "Should have uploaded files from `wwwroot`") |> ignore
        
    [<Test>]
    member this.StackExportsWebsiteUrl() =
        let resources = runTest()
        let stack = resources.OfType<WebsiteStack>() |> Seq.head
    
        let endpoint = getValue stack.Endpoint
        endpoint.Should().Be("https://wwwprodsa.web.core.windows.net", null) |> ignore
