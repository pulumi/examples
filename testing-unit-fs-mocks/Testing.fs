// Copyright 2016-2020, Pulumi Corporation

namespace UnitTesting

open System
open System.Collections.Generic
open System.Collections.Immutable
open System.Threading.Tasks
open Pulumi.Testing

type Mocks() =
    interface IMocks with
        member this.NewResourceAsync(args: MockResourceArgs): Task<ValueTuple<string,obj>> =
            let inputKVs = args.Inputs |> Seq.map(fun kv -> kv.Key, kv.Value) |> Seq.toList
            let nameKVs = if args.Inputs.ContainsKey("name") then [] else [("name", args.Name :> obj)]
            let endpointKVs =
                if args.Type = "azure:storage/account:Account"
                then ["primaryWebEndpoint", sprintf "https://%s.web.core.windows.net" args.Name :> obj]
                else []
            
            let outputs =
                [inputKVs; nameKVs; endpointKVs]
                |> Seq.concat
                |> Seq.filter (fun (k, _) -> args.Type <> "azure:storage/blob:Blob" || k <> "source")
                |> Seq.map KeyValuePair
            let dict = outputs.ToImmutableDictionary() :> obj            

            // Default the resource ID to `{name}_id`.
            let id = if args.Id = null then sprintf "%s_id" args.Name else args.Id 
            Task.FromResult(struct (id, dict))

        member this.CallAsync(args: MockCallArgs): Task<obj> =
            // We don't use this method in this particular test suite.
            // Default to returning whatever we got as input.
            Task.FromResult(null :> obj)
