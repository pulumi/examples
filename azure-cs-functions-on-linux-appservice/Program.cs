using System.Threading.Tasks;
using Pulumi;

namespace Azure.Functions.On.Linux.AppService
{
    class Program
    {
        static Task<int> Main() => Deployment.RunAsync<FunctionsStack>();
    }
}