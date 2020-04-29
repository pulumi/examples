// Copyright 2016-2020, Pulumi Corporation

using System;
using System.Collections.Immutable;
using System.Threading.Tasks;
using Moq;
using Pulumi;
using Pulumi.Testing;

namespace UnitTesting
{
    /// <summary>
    /// Helper methods to streamlines unit testing experience.
    /// </summary>
    public static class Testing
    {
        /// <summary>
        /// Run the tests for a given stack type.
        /// </summary>
        public static Task<ImmutableArray<Resource>> RunAsync<T>() where T : Stack, new()
        {
            var mocks = new Mock<IMocks>();
            mocks.Setup(m => m.NewResourceAsync(It.IsAny<string>(), It.IsAny<string>(),
                    It.IsAny<ImmutableDictionary<string, object>>(), It.IsAny<string>(), It.IsAny<string>()))
                .ReturnsAsync((string type, string name, ImmutableDictionary<string, object> inputs, string? provider, string? id) => (name + "_id", inputs));
            mocks.Setup(m => m.CallAsync(It.IsAny<string>(), It.IsAny<ImmutableDictionary<string, object>>(), It.IsAny<string>()))
                .ReturnsAsync((string token, ImmutableDictionary<string, object> args, string? provider) => args);
            return Deployment.TestAsync<T>(mocks.Object, new TestOptions { IsPreview = false });
        }

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
