using Pulumi;

class MyStack : Stack
{
    public MyStack()
    {
        this.StrVar = "foo";
        this.ArrVar = new string[] { "fizz", "buzz" };
        this.Readme = System.IO.File.ReadAllText("./Pulumi.README.md");
    }

    [Output]
    public Output<string> StrVar { get; set; }

    [Output]
    public Output<string[]> ArrVar { get; set; }

    [Output]
    public Output<string> Readme { get; set; }

}
