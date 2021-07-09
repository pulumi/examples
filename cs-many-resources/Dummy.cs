using Pulumi;

public class Dummy : ComponentResource
{
    public Output<string> Deadweight { get; private set; } = null!;

    public Dummy(string name, Input<string> deadweight, ComponentResourceOptions? options = null)
        : base("examples:dummy:Dummy", name, options)
    {
        this.Deadweight = deadweight;
    }
}
