// Copyright 2016-2020, Pulumi Corporation

using System.Collections.Generic;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Testing;

namespace UnitTesting
{
    class Mocks : IMocks
    {
        public Task<(string? id, object state)> NewResourceAsync(MockResourceArgs args)
        {
            var outputs = ImmutableDictionary.CreateBuilder<string, object>();
            
            // Forward all input parameters as resource outputs, so that we could test them.
            outputs.AddRange(args.Inputs);
            
            // Set the name to resource name if it's not set explicitly in inputs.
            if (!args.Inputs.ContainsKey("name"))
                outputs.Add("name", args.Name);
            
            if (args.Type == "azure-native:storage:Blob")
            {
                // Assets can't directly go through the engine.
                // We don't need them in the test, so blank out the property for now.
                outputs.Remove("source");
            }
            
            // For a Storage Account...
            if (args.Type == "azure-native:storage:StorageAccount")
            {
                // ... set its web endpoint property.
                // Normally this would be calculated by Azure, so we have to mock it. 
                outputs.Add("primaryEndpoints", new Dictionary<string, string> 
                { 
                    { "web", $"https://{args.Name}.web.core.windows.net" },
                }.ToImmutableDictionary());
            }

            // Default the resource ID to `{name}_id`.
            // We could also format it as `/subscription/abc/resourceGroups/xyz/...` if that was important for tests.
            args.Id ??= $"{args.Name}_id";
            return Task.FromResult((args.Id, (object)outputs));
        }
        
        public Task<object> CallAsync(MockCallArgs args)
        {
            // We don't use this method in this particular test suite.
            // Default to returning whatever we got as input.
            return Task.FromResult((object)args.Args);
        }
    }
    
    public static class TestingExtensions
    {
        /// <summary>
        /// Extract the value from an output.
        /// </summary>
        public static Task<T> GetValueAsync<T>(this Output<T> output)
        {
            var tcs = new TaskCompletionSource<T>();
            output.Apply(v =>
            {
                tcs.SetResult(v);
                return v;
            });
            return tcs.Task;
        }
    }
}
