#:sdk Microsoft.NET.Sdk.Web
#:property PublishAot=false

var app = WebApplication.Create(args);
app.MapGet("/", () => "Hello from Pulumi Delivery!\n");
app.Run($"http://0.0.0.0:{Environment.GetEnvironmentVariable("PORT") ?? "8080"}");
