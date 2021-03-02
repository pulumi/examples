// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

using Pulumi;

class DemoStack : Stack
{
    public DemoStack()
    {
        this.FunctionsEndpoint = Functions.Run();
        this.ContainersEndpoint = Containers.Run();
        this.VmssEndpoint = VmScaleSets.Run();
    }

    [Output] public Output<string> FunctionsEndpoint { get; set; }

    [Output] public Output<string> ContainersEndpoint { get; set; }

    [Output] public Output<string> VmssEndpoint { get; set; }
}
