// Copyright 2016-2020, Pulumi Corporation

namespace UnitTesting

open System
open System.Collections.Generic
open System.Collections.Immutable
open System.Threading.Tasks
open Pulumi.Testing

type Mocks() =
    interface IMocks with
        member this.NewResourceAsync(typeName: string, name: string, inputs: ImmutableDictionary<string, obj>, provider: string, id: string): Task<ValueTuple<string,obj>> =
            let inputKVs = inputs |> Seq.map(fun kv -> kv.Key, kv.Value) |> Seq.toList
            let nameKVs = if inputs.ContainsKey("name") then [] else [("name", name :> obj)]
            let endpointKVs =
                if typeName = "azure:storage/account:Account"
                then ["primaryWebEndpoint", sprintf "https://%s.web.core.windows.net" name :> obj]
                else []
            
            let outputs =
                [inputKVs; nameKVs; endpointKVs]
                |> Seq.concat
                |> Seq.filter (fun (k, _) -> typeName <> "azure:storage/blob:Blob" || k <> "source")
                |> Seq.map KeyValuePair
            let dict = outputs.ToImmutableDictionary() :> obj            

            // Default the resource ID to `{name}_id`.
            let id = if id = null then sprintf "%s_id" name else id 
            Task.FromResult(struct (id, dict))
            
        member this.CallAsync(token: string, inputs: ImmutableDictionary<string, obj>, provider: string): Task<obj> =
            // We don't use this method in this particular test suite.
            // Default to returning whatever we got as input.
            Task.FromResult(null :> obj)
