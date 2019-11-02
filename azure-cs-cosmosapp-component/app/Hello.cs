using System;
using System.IO;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Extensions.Http;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace Functions
{
    public static class MyFunctions
    {
        [FunctionName("Hello")]
        public static async Task<IActionResult> Hello(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = null)] HttpRequest req,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            string name = req.Query["name"];

            string requestBody = await new StreamReader(req.Body).ReadToEndAsync();
            dynamic data = JsonConvert.DeserializeObject(requestBody);
            name = name ?? data?.name;

            return name != null
                ? (ActionResult)new OkObjectResult($"Hello, {name}")
                : new BadRequestObjectResult("Please pass a name on the query string or in the request body");
        }

        [FunctionName("Cosmos")]
        public static IActionResult Cosmos(
            [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "cosmos")] HttpRequest req,
            [CosmosDB(databaseName: "pricedb",
                collectionName: "prices",
                ConnectionStringSetting = "CosmosDBConnection",
                Id = "test")] ToDoItem toDoItem,
            ILogger log)
        {
            log.LogInformation("C# HTTP trigger function processed a request.");

            if (toDoItem == null)
            {
                return new OkObjectResult("Please create a document with id=test");
            }
            else
            {
                return new OkObjectResult(toDoItem);
            }
        }

        public class ToDoItem
        {
            public string Id { get; set; }
            public string Name { get; set; }
        }
    }
}
