// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using System.Threading.Tasks;

using Pulumi;

class Program
{
    static Task<int> Main()
    {
        return Deployment.RunAsync(() =>
        {
            var functions = Functions.Run();
            var containers = Containers.Run();
            var vmss = VmScaleSets.Run();
            return new Dictionary<string, object?>
            {
                { "functionsEndpoint", functions["functionsEndpoint"] },
                { "containersEndpoint", containers["containersEndpoint"] },
                { "vmssEndpoint", vmss["vmssEndpoint"] },
            };
        });
    }
}
