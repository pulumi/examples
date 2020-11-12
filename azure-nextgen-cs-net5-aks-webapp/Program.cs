using Pulumi;

await Deployment.RunAsync<MyStack>();

class MyStack : Stack
{
    public MyStack()
    {
        var cluster = new AksCluster("aks");

        var app = new WebApplication("hello", new()
        {
            Cluster = cluster,
            AppFolder = "./app"
        });

        this.Endpoint = app.Endpoint;
    }
    
    [Output] public Output<string> Endpoint { get; set; }
}
