// Copyright 2016-2020, Pulumi Corporation

using System.Collections.Immutable;
using System.Threading.Tasks;
using Pulumi;
using System;
using Pulumi.Aws.Ec2;
using Pulumi.Testing;

namespace UnitTesting
{
    class Mocks : IMocks
    {
        /// <summary>
        /// Returns the resource type token of a type.
        /// </summary>
        string Token<T>()
        {
            var typeInfo = typeof(T);
            var attributes = typeInfo.GetCustomAttributesData();
            foreach (var attribute in attributes)
            {
                if (attribute.AttributeType.FullName?.StartsWith("Pulumi") == true)
                {
                    return (string)attribute.ConstructorArguments[0].Value!;
                }
            }
            
            throw new InvalidOperationException($"Could not find the type token for resource {typeInfo.FullName}");
        }
        
        /// <summary>
        /// Type-safe way to get the wire format of a property name
        /// </summary>
        string PropertyName<T>(Func<T, string> map)
        {
            var typeInfo = typeof(T);
            var propertyName = map(default!);
            var properties = typeInfo.GetProperties();
            foreach (var property in properties)
            {
                if (property.Name == propertyName)
                {
                    foreach (var attribute in property.CustomAttributes)
                    {
                        if (attribute.AttributeType.FullName?.StartsWith("Pulumi") == true)
                        {
                            return (string)attribute.ConstructorArguments[0].Value!;
                        }
                    }
                }
            }
            
            throw new InvalidOperationException($"Could not find the property name for resource {typeInfo.FullName}");
        }
        
        public Task<(string? id, object state)> NewResourceAsync(MockResourceArgs args)
        {
            var outputs = ImmutableDictionary.CreateBuilder<string, object>();

            // Forward all input parameters as resource outputs, so that we could test them.
            outputs.AddRange(args.Inputs);

            if (args.Type == Token<Instance>())
            {
                var publicIp = PropertyName<Instance>(instance => nameof(instance.PublicIp));
                var publicDns = PropertyName<Instance>(instance => nameof(instance.PublicDns));
                outputs.Add(publicIp, "203.0.113.12");
                outputs.Add(publicDns, "ec2-203-0-113-12.compute-1.amazonaws.com");
            }

            // Default the resource ID to `{name}_id`.
            // We could also format it as `/subscription/abc/resourceGroups/xyz/...` if that was important for tests.
            args.Id ??= $"{args.Name}_id";
            return Task.FromResult<(string? id, object state)>((args.Id, (object)outputs));
        }

        public Task<object> CallAsync(MockCallArgs args)
        {
            var outputs = ImmutableDictionary.CreateBuilder<string, object>();

            if (args.Token == "aws:index/getAmi:getAmi")
            {
                outputs.Add("architecture", "x86_64");
                outputs.Add("id", "ami-0eb1f3cdeeb8eed2a");
            }

            return Task.FromResult((object)outputs);
        }
    }

    /// <summary>
    /// Helper methods to streamlines unit testing experience.
    /// </summary>
    public static class Testing
    {
        /// <summary>
        /// Run the tests for a given stack type.
        /// </summary>
        public static Task<ImmutableArray<Resource>> RunAsync<T>() where T : Stack, new() => Deployment.TestAsync<T>(new Mocks(), new TestOptions { IsPreview = false });

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
