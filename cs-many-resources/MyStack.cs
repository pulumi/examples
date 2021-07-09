using System;
using System.Linq;
using System.Collections.Generic;
using System.Collections.Immutable;

using Pulumi;

class MyStack : Stack
{
    [Output]
    public Output<ImmutableDictionary<string,string>> Outputs { get; set; }

    public MyStack()
    {
        int resourceCount = GetEnv("RESOURCE_COUNT", 64);
        int resourcePayloadBytes = GetEnv("RESOURCE_PAYLOAD_BYTES", 1024);

        var builder = ImmutableDictionary.CreateBuilder<string, Output<string>>();

        for (var i = 0; i < resourceCount; i++) {
            string deadweight = String.Concat(Enumerable.Repeat(
                String.Format("{0:00000000}", i), 
                resourcePayloadBytes/8));
            Dummy dummy = new Dummy($"dummy-{i}", deadweight);
            builder.Add($"output-{i}", dummy.Deadweight);
        }

        this.Outputs = Unroll(builder.ToImmutable());
    }

    private static int GetEnv(string name, int defaultValue)
    {
        var v = System.Environment.GetEnvironmentVariable(name);
        return v == null ? defaultValue : int.Parse(v);
    }

    private static Output<ImmutableDictionary<string,string>> Unroll(
        ImmutableDictionary<string,Output<string>> dict)
    {
        return Output.All(
            from kv in dict 
            select kv.Value.Apply(v => new KeyValuePair<string,string>(kv.Key, v))
        ).Apply(pairs => ImmutableDictionary.CreateRange(pairs));
    }
}
