module Program

open Pulumi
open Pulumi.FSharp
open Pulumi.Azure.ContainerService
open Pulumi.Azure.ContainerService.Inputs
open Pulumi.Azure.Core
open Pulumi.Docker

[<AutoOpen>]
module Helpers =
    let inputLeft<'a, 'b>(v: 'a) : InputUnion<'a, 'b> = InputUnion.op_Implicit v

let infra () =
    let resourceGroup = ResourceGroup "aci-rg"

    let registry =
        Registry("registry",
            RegistryArgs
               (ResourceGroupName = io resourceGroup.Name,
                AdminEnabled = input true,
                Sku = input "Premium"))

    let imageName = registry.LoginServer |> Outputs.apply(fun v -> v + "/mynodeapp:v1.0.0") |> io
    let dockerImage = 
        Image("node-app",
            ImageArgs
               (ImageName = imageName,
                Build = inputLeft "./app",
                Registry = input(
                    ImageRegistry
                       (Server = io registry.LoginServer,
                        Username = io registry.AdminUsername,
                        Password = io registry.AdminPassword))))

    let group = 
        Group("aci",
            GroupArgs
               (ResourceGroupName = io resourceGroup.Name,
                ImageRegistryCredentials = inputList [input
                   (GroupImageRegistryCredentialArgs
                       (Server = io registry.LoginServer,
                        Username = io registry.AdminUsername,
                        Password = io registry.AdminPassword))],
                OsType = input "Linux",
                Containers = inputList [input
                   (GroupContainerArgs
                       (Cpu = input 0.5,
                        Image = io dockerImage.ImageName,
                        Memory = input 1.5,
                        Name = input "hello-world",
                        Ports = inputList [input (GroupContainerPortArgs(Port = input 80, Protocol = input "TCP"))]
                       ))],
                IpAddressType = input "public",
                DnsNameLabel = input "acifsharp"))

    dict [("endpoint", group.Fqdn :> obj)]

[<EntryPoint>]
let main _ =
    Deployment.run infra
