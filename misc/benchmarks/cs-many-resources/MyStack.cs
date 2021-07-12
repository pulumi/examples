using System;
using System.Linq;
using System.Collections.Generic;
using System.Collections.Immutable;

using Pulumi;

class MyStack : Stack
{
    [Output]
    public Output<int> ResourceCount { get; set; }

    [Output]
    public Output<int> ResourcePayloadBytes { get; set; }

    public MyStack()
    {
        var config = new Config();
        int resourceCount = config.RequireInt32("resource_count");
        int resourcePayloadBytes = config.RequireInt32("resource_payload_bytes");

        Output<int> resourcePayloadBytesOutput = Output.Create(resourcePayloadBytes);

        for (var i = 0; i < resourceCount; i++) {
            string deadweight = String.Concat(Enumerable.Repeat(
                String.Format("{0:00000000}", i),
                resourcePayloadBytes/8));
            Dummy dummy = new Dummy($"dummy-{i}", deadweight);
            resourcePayloadBytesOutput = dummy.Deadweight.Apply(w => w.Length);
        }

        this.ResourceCount = Output.Create(resourceCount);
        this.ResourcePayloadBytes = resourcePayloadBytesOutput;
    }

    private static int GetEnv(string name, int defaultValue)
    {
        var v = System.Environment.GetEnvironmentVariable(name);
        return v == null ? defaultValue : int.Parse(v);
    }
}
