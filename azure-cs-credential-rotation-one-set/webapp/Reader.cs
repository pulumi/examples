using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.Azure.Services.AppAuthentication;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using System.Data.SqlClient;
using Microsoft.Azure.Storage.Auth;
using System.IO;
using Microsoft.Azure.Storage.Blob;

namespace webapp
{
    public class Reader
    {
        public Reader(IConfiguration configuration)
        {
            this.Configuration = configuration;
        }

        private IConfiguration Configuration { get; }

        public async Task<string> GetSqlUser()
        {
            var connectionString = Configuration.GetConnectionString("db");
            var token = await GetTokenAsync("database.windows.net");
            using (var conn = new SqlConnection(connectionString))
            {
                conn.AccessToken = token;
                await conn.OpenAsync();
                
                using (var cmd = new SqlCommand("SELECT SUSER_SNAME()", conn))
                {
                    var result = await cmd.ExecuteScalarAsync();
                    return result as string;
                }
            }
        }

        public async Task<string> GetBlobText()
        {
            string accessToken = await GetTokenAsync("storage.azure.com");
            var tokenCredential = new TokenCredential(accessToken);
            var storageCredentials = new StorageCredentials(tokenCredential);
            // Define the blob to read
            var url = Environment.GetEnvironmentVariable("StorageBlobUrl");
            var blob = new CloudBlockBlob(new Uri(url), storageCredentials);
            // Open a data stream to the blob
            return await blob.DownloadTextAsync();
        }

        private static Task<String> GetTokenAsync(string service)
        {
            var provider = new AzureServiceTokenProvider();
            return provider.GetAccessTokenAsync($"https://{service}/");
        }
    }
}
