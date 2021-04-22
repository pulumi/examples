// Copyright 2016-2021, Pulumi Corporation.  All rights reserved.

using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using Pulumi;
using Pulumi.AzureNative.Authorization;
using Pulumi.AzureNative.ContainerRegistry;
using Pulumi.AzureNative.ContainerRegistry.Inputs;
using Pulumi.AzureNative.Resources;
using Deployment = Pulumi.Deployment;
using RoleAssignment = Pulumi.AzureNative.Authorization.RoleAssignment;

await Deployment.RunAsync<MyStack>();

class MyStack : Stack
{
    [Output]
    public Output<string> Result { get; set; } 
    public MyStack()
    {
        var resourceGroup = new ResourceGroup("registry-rg");
        
        var registry = new Registry("registry", new()
        {
            ResourceGroupName = resourceGroup.Name,
            
            Sku = new SkuArgs { Name = SkuName.Basic },
            AdminUserEnabled = true
        });
        
        var currentServicePrincipalId = Output.Create(GetClientConfig.InvokeAsync()).Apply(c => c.ObjectId);
        
        var grantPull = new RoleAssignment("access-from-cluster", new()
        {
            PrincipalId = currentServicePrincipalId,
            PrincipalType = PrincipalType.ServicePrincipal, // adjust the type if you are running as a user
            RoleDefinitionId = Output.Create(GetRoleIdByName("AcrPull")),
            Scope = registry.Id
        });
    }
    
    private static async System.Threading.Tasks.Task<string> GetRoleIdByName(string roleName, string? scope = null) {
        var config = await GetClientConfig.InvokeAsync();
        var token = await GetClientToken.InvokeAsync();
        
        // Unfortunately, Microsoft hasn't shipped an .NET5-compatible SDK at the time of writing this.
        // So, we have to hand-craft an HTTP request to retrieve a role definition.
        var httpClient = new HttpClient();
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        var response = await httpClient.GetAsync($"https://management.azure.com/subscriptions/{config.SubscriptionId}/providers/Microsoft.Authorization/roleDefinitions?api-version=2018-01-01-preview&$filter=roleName%20eq%20'{roleName}'");
        if (!response.IsSuccessStatusCode)
        {
            throw new Exception($"Request failed with {response.StatusCode}");
        }
        var body = await response.Content.ReadAsStringAsync();
        var definition = JsonSerializer.Deserialize<RoleDefinition>(body);
        return definition.value[0].id;
    }

    public class RoleDefinition
    {
        public List<RoleDefinitionValue> value { get; set; }
    }
    public class RoleDefinitionValue
    {
        public string id { get; set; }
        public string type { get; set; }
        public string name { get; set; }
    }
}
