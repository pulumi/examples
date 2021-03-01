using System;
using Microsoft.Azure.WebJobs;
using Microsoft.Azure.WebJobs.Host;
using Microsoft.Extensions.Logging;

namespace queue
{
    public static class queue
    {
        [FunctionName("queue")]
        public static void Run([QueueTrigger("%queuename%", Connection = "queueConnectionString")]string myQueueItem, ILogger log)
        {
            log.LogInformation($"C# Queue trigger function processed: {myQueueItem}");
        }
    }
}
