using Microsoft.AspNetCore.Builder;

namespace SampleApplication.Web
{
    public class Startup
    {
	    public void Configure(IApplicationBuilder app) => app.UseWelcomePage();
    }
}
