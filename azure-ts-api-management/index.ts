import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

// use first 10 characters of the stackname as prefix for resource names
const prefix = pulumi.getStack().substring(0, 9);

// Create an Azure Resource Group
const resourceGroup = new azure.core.ResourceGroup(`${prefix}-rg`, {
    location: azure.Locations.WestUS2,
});

// Create an HTTP Azure Function which will be the "backend" of our API.
// It accepts a name in the query string and returns a JSON back with the greeting and timestamp.
const httpFunction = new azure.appservice.HttpEventSubscription("greeting-func", {
    resourceGroup,
    callback: async (context, request) => {
        return {
            status: 200,
            headers: {
                "content-type": "application/json",
            },
            body: {
                time: new Date(),
                greeting: `Hello ${request.query["name"] || "friend"}!`,
            },
        };
    },
});

// Create an API Management Service instance
const service = new azure.apimanagement.Service("greeting-service", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: "Developer",
        capacity: 1,
    },
    publisherName: "YourCompany",
    publisherEmail: "api@yourcompany.com",    
});

// Create the API definition and map it to the HTTP Function backend
const api = new azure.apimanagement.Api("greeting-api", {
    resourceGroupName: resourceGroup.name,
    apiManagementName: service.name,
    displayName: "Greetings",
    path: "hello",
    protocols: ["https"],
    revision: "1",
    serviceUrl: httpFunction.url,
});

// Create an operation with templated URL which will accept the name in the path
const operation = new azure.apimanagement.ApiOperation("hello", {
    resourceGroupName: resourceGroup.name,
    apiManagementName: service.name,
    apiName: api.name,
    urlTemplate: "/{name}",
    method: "GET",
    displayName: "Say Hello",
    operationId: "sayhello",
    templateParameters: [{
        name: "name",
        required: true,
        type: "string",
    }],
});

// Define the operation policy that does two things:
//   1. Rewrites the URL to put the name from the path segment to a query parameter
//   2. Caches the response for 30 seconds
new azure.apimanagement.ApiOperationPolicy("hello-policy", {
    resourceGroupName: resourceGroup.name,
    apiManagementName: service.name,
    apiName: api.name,
    operationId: operation.operationId,
    xmlContent: 
    `<policies>
        <inbound>
            <base />
            <rewrite-uri template="?name={name}" />
            <cache-lookup vary-by-developer="false" vary-by-developer-groups="false" />
        </inbound>
        <backend>
            <base />
        </backend>
        <outbound>
            <base />
            <cache-store duration="30" />
        </outbound>
        <on-error>
            <base />
        </on-error>
    </policies>`
});

// Create an API Management product
const product = new azure.apimanagement.Product("greeting-product", {
    resourceGroupName: resourceGroup.name,
    apiManagementName: service.name,
    productId: "greeting",
    displayName: "Product for Greetings",
    published: true,
    subscriptionRequired: true,
});

// Link the API to the Product
new azure.apimanagement.ProductApi("greeting-product-api", {
   resourceGroupName: resourceGroup.name,
   apiManagementName: service.name,
   apiName: api.name,
   productId: product.productId,    
});

// Create a first user for our API
const user = new azure.apimanagement.User("bot", {
   resourceGroupName: resourceGroup.name,
   apiManagementName: service.name,
   userId: "bot",
   firstName: "Robo",
   lastName: "Bot",
   email: "robobot@yourcompany.com",
});

// Create a subscription to the product for the user
const subscription = new azure.apimanagement.Subscription("bot-subscription", {
   resourceGroupName: resourceGroup.name,
   apiManagementName: service.name,
   displayName: "Bot Subscription",
   productId: product.id,
   userId: user.id,
   state: "active",
});

export const endpoint = pulumi.interpolate`${service.gatewayUrl}/${api.path}/Pulumi`;
export const key = subscription.primaryKey;
