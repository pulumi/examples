// Copyright 2016-2020, Pulumi Corporation

using System.Collections.Immutable;
using System.Linq;
using System.Threading.Tasks;
using Pulumi;
using Pulumi.Testing;

namespace UnitTesting
{
    class Mocks : IMocks
    {
        public Task<(string id, object state)> NewResourceAsync(string type, string name, ImmutableDictionary<string, object> inputs, string? provider, string? id)
        {
            var outputs = ImmutableDictionary.CreateBuilder<string, object>();
            
            // Forward all input parameters as resource outputs, so that we could test them.
            outputs.AddRange(inputs);
            
            // Set the name to resource name if it's not set explicitly in inputs.
            if (!inputs.ContainsKey("name"))
                outputs.Add("name", name);
            
            if (type == "azure:storage/blob:Blob")
            {
                // Assets can't directly go through the engine.
                // We don't need them in the test, so blank out the property for now.
                outputs.Remove("source");
            }
            
            // For a Storage Account...
            if (type == "azure:storage/account:Account")
            {
                // ... set its web endpoint property.
                // Normally this would be calculated by Azure, so we have to mock it. 
                outputs.Add("primaryWebEndpoint", $"https://{name}.web.core.windows.net");
            }

            // Default the resource ID to `{name}_id`.
            // We could also format it as `/subscription/abc/resourceGroups/xyz/...` if that was important for tests.
            id ??= $"{name}_id";
            return Task.FromResult((id, (object)outputs));
        }

        public Task<object> CallAsync(string token, ImmutableDictionary<string, object> inputs, string? provider)
        {
            // We don't use this method in this particular test suite.
            // Default to returning whatever we got as input.
            return Task.FromResult((object)inputs);
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
