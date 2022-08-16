namespace Tests;

using Pulumi;
using System.Threading.Tasks;

public static class TestingExtensions
{
    /// <summary>
    /// Extract the value from an output. Only use for testing!
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