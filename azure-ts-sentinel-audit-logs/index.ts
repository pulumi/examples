// Copyright 2026, Pulumi Corporation. All rights reserved.

import * as azure_native from "@pulumi/azure-native";
import * as pulumi from "@pulumi/pulumi";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const config = new pulumi.Config();
const orgName = config.require("orgName");
const accessToken = config.requireSecret("accessToken");
const workspaceName = config.require("workspaceName");
const resourceGroupName = config.require("resourceGroupName");

const apiUrl = (config.get("apiUrl") ?? "https://api.pulumi.com").replace(/\/+$/, "");

const connectorDefinitionName = "PulumiAuditLogsDefinition";
const tableName = "PulumiAuditLogs_CL";
const streamName = "Custom-PulumiAuditLogs";

// ---------------------------------------------------------------------------
// Look up the existing Log Analytics workspace
// ---------------------------------------------------------------------------

const workspace = azure_native.operationalinsights.getWorkspaceOutput({
    resourceGroupName,
    workspaceName,
});

// ---------------------------------------------------------------------------
// 1. Custom Log Analytics table
// ---------------------------------------------------------------------------

const table = new azure_native.operationalinsights.Table("table", {
    resourceGroupName,
    workspaceName,
    tableName,
    schema: {
        name: tableName,
        columns: [
            { name: "TimeGenerated", type: "datetime", description: "The timestamp (UTC) when the audit log event occurred." },
            { name: "Timestamp_d", type: "long", description: "Original Unix epoch seconds of the event." },
            { name: "SourceIP_s", type: "string", description: "IP address of the client that triggered the event." },
            { name: "Event_s", type: "string", description: "Audit log event type identifier." },
            { name: "Description_s", type: "string", description: "Human-readable description of the event." },
            { name: "UserName_s", type: "string", description: "Display name of the user who performed the action." },
            { name: "UserLogin_s", type: "string", description: "GitHub login of the user who performed the action." },
            { name: "UserAvatarUrl_s", type: "string", description: "Avatar URL of the user." },
            { name: "TokenID_s", type: "string", description: "ID of the access token used, if applicable." },
            { name: "TokenName_s", type: "string", description: "Name of the access token used, if applicable." },
            { name: "ActorName_s", type: "string", description: "Display name of a non-human actor." },
            { name: "ActorUrn_s", type: "string", description: "Pulumi URN of a non-human actor." },
            { name: "RequireOrgAdmin_b", type: "boolean", description: "Whether the action required organization admin privileges." },
            { name: "RequireStackAdmin_b", type: "boolean", description: "Whether the action required stack admin privileges." },
            { name: "AuthFailure_b", type: "boolean", description: "Whether the event represents a failed authentication attempt." },
        ],
    },
});

// ---------------------------------------------------------------------------
// 2. Data Collection Endpoint
// ---------------------------------------------------------------------------

const dataCollectionEndpoint = new azure_native.monitor.DataCollectionEndpoint("dataCollectionEndpoint", {
    resourceGroupName,
    dataCollectionEndpointName: "PulumiAuditLogsDCE",
    location: workspace.location,
    networkAcls: {
        publicNetworkAccess: azure_native.monitor.KnownPublicNetworkAccessOptions.Enabled,
    },
});

// ---------------------------------------------------------------------------
// 3. Data Collection Rule (with corrected KQL transform)
// ---------------------------------------------------------------------------

// The KQL transform converts raw API responses into the typed table schema.
// Key fixes from the ARM version:
//   - Boolean fields (reqOrgAdmin, reqStackAdmin, authFailure) use Go omitzero,
//     so they are absent from JSON when false. coalesce(..., false) ensures we
//     get false instead of null.
//   - String fields (tokenID, tokenName) use Go omitempty, so they are absent
//     when empty. coalesce(..., "") ensures we get "" instead of null.
const transformKql = [
    "source",
    "| extend TimeGenerated = datetime(1970-01-01) + tolong(timestamp) * 1s",
    "| project",
    "    TimeGenerated,",
    "    Timestamp_d = tolong(timestamp),",
    "    SourceIP_s = tostring(sourceIP),",
    "    Event_s = tostring(event),",
    "    Description_s = tostring(description),",
    "    UserName_s = tostring(user.name),",
    "    UserLogin_s = tostring(user.githubLogin),",
    "    UserAvatarUrl_s = tostring(user.avatarUrl),",
    '    TokenID_s = iff(isnull(tokenID), "", tostring(tokenID)),',
    '    TokenName_s = iff(isnull(tokenName), "", tostring(tokenName)),',
    "    ActorName_s = tostring(actorName),",
    "    ActorUrn_s = tostring(actorUrn),",
    "    RequireOrgAdmin_b = iff(isnull(reqOrgAdmin), false, tobool(reqOrgAdmin)),",
    "    RequireStackAdmin_b = iff(isnull(reqStackAdmin), false, tobool(reqStackAdmin)),",
    "    AuthFailure_b = iff(isnull(authFailure), false, tobool(authFailure))",
].join(" ");

const dataCollectionRule = new azure_native.monitor.DataCollectionRule("dataCollectionRule", {
    resourceGroupName,
    dataCollectionRuleName: "PulumiAuditLogsDCR",
    dataCollectionEndpointId: dataCollectionEndpoint.id,
    streamDeclarations: {
        [streamName]: {
            columns: [
                { name: "timestamp", type: "long" },
                { name: "sourceIP", type: "string" },
                { name: "event", type: "string" },
                { name: "description", type: "string" },
                { name: "user", type: "dynamic" },
                { name: "tokenID", type: "string" },
                { name: "tokenName", type: "string" },
                { name: "actorName", type: "string" },
                { name: "actorUrn", type: "string" },
                { name: "reqOrgAdmin", type: "boolean" },
                { name: "reqStackAdmin", type: "boolean" },
                { name: "authFailure", type: "boolean" },
            ],
        },
    },
    destinations: {
        logAnalytics: [{
            workspaceResourceId: workspace.id,
            name: "clv2ws1",
        }],
    },
    dataFlows: [{
        streams: [streamName],
        destinations: ["clv2ws1"],
        transformKql,
        outputStream: `${streamName}_CL`,
    }],
}, { dependsOn: [table, dataCollectionEndpoint] });

// ---------------------------------------------------------------------------
// 4. Connector UI definition
// ---------------------------------------------------------------------------

const connectorDefinition = new azure_native.securityinsights.CustomizableConnectorDefinition("connectorDefinition", {
    resourceGroupName,
    workspaceName,
    dataConnectorDefinitionName: connectorDefinitionName,
    kind: "Customizable",
    connectorUiConfig: {
        id: connectorDefinitionName,
        title: "Pulumi Cloud Audit Logs",
        publisher: "Pulumi",
        descriptionMarkdown: [
            "The Pulumi Cloud Audit Logs connector provides the capability to ingest",
            "[Pulumi Cloud audit log events](https://www.pulumi.com/docs/pulumi-cloud/audit-logs/)",
            "into Microsoft Sentinel. By connecting Pulumi Cloud audit logs to Microsoft Sentinel,",
            "you can monitor infrastructure-as-code operations, detect unauthorized access attempts,",
            "track organization membership changes, and investigate security incidents.",
            "\n\nThis connector polls the Pulumi Cloud REST API to retrieve audit log events for your organization.",
        ].join(" "),
        graphQueries: [{
            metricName: "Total events received",
            legend: "PulumiAuditLogEvents",
            baseQuery: tableName,
        }],
        dataTypes: [{
            name: tableName,
            lastDataReceivedQuery: `${tableName}\n| summarize Time = max(TimeGenerated)\n| where isnotempty(Time)`,
        }],
        connectivityCriteria: [{
            type: "HasDataConnectors",
        }],
        availability: {
            isPreview: true,
        },
        permissions: {
            resourceProvider: [{
                provider: "Microsoft.OperationalInsights/workspaces",
                permissionsDisplayText: "Read and Write permissions are required.",
                providerDisplayName: "Workspace",
                scope: "Workspace",
                requiredPermissions: {
                    write: true,
                    read: true,
                    delete: true,
                },
            }],
            customs: [{
                name: "Pulumi Cloud access token",
                description: [
                    "A Pulumi Cloud [personal access token](https://www.pulumi.com/docs/pulumi-cloud/access-management/access-tokens/)",
                    "with permissions to read audit logs is required.",
                    "The organization must have a Pulumi Enterprise or Business Critical subscription with audit logs enabled.",
                ].join(" "),
            }],
        },
        instructionSteps: [{
            title: "Connect Pulumi Cloud Audit Logs to Microsoft Sentinel",
            description: [
                "Provide your Pulumi Cloud organization name and access token to start ingesting audit log events.",
                "\n\n1. Create a [Pulumi access token](https://app.pulumi.com/account/tokens) with audit log read permissions.",
                "\n2. Enter your Pulumi organization name and access token below.",
                "\n3. Optionally customize the API URL if you use a self-hosted Pulumi Cloud instance.",
            ].join(""),
            instructions: [
                {
                    type: "DataConnectorsGrid",
                    parameters: {
                        mapping: [{
                            columnName: "Pulumi Organization",
                            columnValue: "properties.request.queryParameters.orgName",
                        }],
                        menuItems: ["DeleteConnector"],
                    },
                },
                {
                    type: "ContextPane",
                    parameters: {
                        isPrimary: true,
                        label: "Add Organization",
                        title: "Connect Pulumi Cloud Organization",
                        contextPaneType: "DataConnectorsContextPane",
                        instructionSteps: [{
                            instructions: [
                                {
                                    type: "Textbox",
                                    parameters: {
                                        label: "Pulumi Organization Name",
                                        placeholder: "my-org",
                                        type: "text",
                                        name: "OrgName",
                                    },
                                },
                                {
                                    type: "Textbox",
                                    parameters: {
                                        label: "Pulumi Access Token",
                                        placeholder: "pul-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                                        type: "password",
                                        name: "apikey",
                                    },
                                },
                                {
                                    type: "Textbox",
                                    parameters: {
                                        label: "Pulumi API URL (optional)",
                                        placeholder: "https://api.pulumi.com",
                                        type: "text",
                                        name: "ApiUrl",
                                    },
                                },
                            ],
                        }],
                    },
                },
            ],
        }],
    },
});

// ---------------------------------------------------------------------------
// 5. RestApiPoller data connector
//
// Created via a dynamic resource that calls the ARM REST API directly,
// because the azure-native SDK's typed RestApiPollerDataConnector strips
// the nextPageTokenJsonPath and nextPageParaName paging fields that the
// ARM API requires. This approach works in both the CLI path (az login)
// and the Deployments wizard path (service principal credentials).
// ---------------------------------------------------------------------------

// Acquire a fresh Azure management token using DefaultAzureCredential.
// This is used inside the dynamic resource provider, which is serialized
// and cannot call Pulumi SDK functions like authorization.getClientToken().
// DefaultAzureCredential supports all auth methods: service principal,
// Pulumi ESC / azure-native sets ARM_* env vars, but @azure/identity's
// DefaultAzureCredential expects AZURE_* env vars. Bridge the gap by
// constructing a ClientSecretCredential from ARM_* when available,
// falling back to DefaultAzureCredential for CLI users (az login, etc.).
async function getAzureManagementToken(): Promise<string> {
    const identity = await import("@azure/identity");
    const clientId = process.env.ARM_CLIENT_ID;
    const clientSecret = process.env.ARM_CLIENT_SECRET;
    const tenantId = process.env.ARM_TENANT_ID;
    const credential = clientId && clientSecret && tenantId
        ? new identity.ClientSecretCredential(tenantId, clientId, clientSecret)
        : new identity.DefaultAzureCredential();
    const token = await credential.getToken("https://management.azure.com/.default");
    return token.token;
}

const dataConnectorProvider: pulumi.dynamic.ResourceProvider = {
    async create(inputs: any) {
        const token = await getAzureManagementToken();
        const resp = await fetch(inputs.resourceUrl, {
            method: "PUT",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: inputs.body,
        });
        if (!resp.ok) {
            throw new Error(`ARM PUT failed: ${resp.status} ${await resp.text()}`);
        }
        return { id: "PulumiAuditLogsPoller", outs: { resourceUrl: inputs.resourceUrl } };
    },

    async delete(id: string, props: any) {
        const token = await getAzureManagementToken();
        const resp = await fetch(props.resourceUrl, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${token}` },
        });
        // 204 (deleted) and 404 (already gone) are both fine.
        if (!resp.ok && resp.status !== 404) {
            throw new Error(`ARM DELETE failed: ${resp.status} ${await resp.text()}`);
        }
    },

    async diff(id: string, olds: any, news: any) {
        // Detect changes in the request body (e.g., token rotation) or resource URL.
        const replaces: string[] = [];
        if (olds.body !== news.body) {
            replaces.push("body");
        }
        if (olds.resourceUrl !== news.resourceUrl) {
            replaces.push("resourceUrl");
        }
        return { changes: replaces.length > 0, replaces };
    },
};

class DataConnectorResource extends pulumi.dynamic.Resource {
    constructor(name: string, props: Record<string, pulumi.Input<string>>, opts?: pulumi.CustomResourceOptions) {
        super(dataConnectorProvider, name, props, opts);
    }
}

const connectorResourceUrl = pulumi.interpolate`https://management.azure.com${workspace.id}/providers/Microsoft.SecurityInsights/dataConnectors/PulumiAuditLogsPoller?api-version=2024-04-01-preview`;

const dataConnectorBody = pulumi.all([
    dataCollectionEndpoint.logsIngestion,
    dataCollectionRule.immutableId,
    accessToken,
]).apply(([logsIngestion, immutableId, token]) => JSON.stringify({
    kind: "RestApiPoller",
    properties: {
        connectorDefinitionName,
        dcrConfig: {
            dataCollectionEndpoint: logsIngestion?.endpoint ?? "",
            dataCollectionRuleImmutableId: immutableId,
            streamName,
        },
        dataType: tableName,
        auth: {
            type: "APIKey",
            apiKeyName: "Authorization",
            ApiKey: token,
            apiKeyIdentifier: "token",
        },
        request: {
            apiEndpoint: `${apiUrl}/api/orgs/${orgName}/auditlogs/v2`,
            httpMethod: "GET",
            queryTimeFormat: "UnixTimestamp",
            startTimeAttributeName: "startTime",
            endTimeAttributeName: "endTime",
            queryWindowInMin: 5,
            rateLimitQPS: 2,
            retryCount: 3,
            timeoutInSeconds: 60,
            headers: {
                Accept: "application/json",
                "User-Agent": "Scuba",
            },
            queryParameters: {
                orgName,
            },
        },
        response: {
            eventsJsonPaths: ["$.auditLogEvents"],
            format: "json",
        },
        paging: {
            pagingType: "NextPageToken",
            nextPageTokenJsonPath: "$.continuationToken",
            nextPageParaName: "continuationToken",
        },
        isActive: true,
    },
}));

const dataConnector = new DataConnectorResource("dataConnector", {
    resourceUrl: connectorResourceUrl,
    body: dataConnectorBody,
}, { dependsOn: [connectorDefinition, dataCollectionRule], deleteBeforeReplace: true });

// ---------------------------------------------------------------------------
// 6. Analytic rules
// ---------------------------------------------------------------------------

const enableAnalyticRules = config.getBoolean("enableAnalyticRules") ?? true;

if (enableAnalyticRules) {

    const authFailureRule = new azure_native.securityinsights.ScheduledAlertRule("authFailureRule", {
        resourceGroupName,
        workspaceName,
        kind: "Scheduled",
        displayName: "Pulumi Cloud - Excessive Authentication Failures",
        description: "Detects when there are more than 5 authentication failures from a single IP address within a 15-minute window. This may indicate a brute force attack or compromised credentials.",
        severity: "Medium",
        enabled: true,
        query: [
            "PulumiAuditLogs_CL",
            "| where AuthFailure_b == true",
            "| summarize FailCount = count() by SourceIP_s, bin(TimeGenerated, 15m)",
            "| where FailCount > 5",
            "| extend IPCustomEntity = SourceIP_s",
        ].join("\n"),
        queryFrequency: "PT15M",
        queryPeriod: "PT15M",
        triggerOperator: "GreaterThan",
        triggerThreshold: 0,
        suppressionDuration: "PT1H",
        suppressionEnabled: false,
        tactics: ["CredentialAccess", "InitialAccess"],
        techniques: ["T1110"],
        entityMappings: [{
            entityType: "IP",
            fieldMappings: [{
                identifier: "Address",
                columnName: "SourceIP_s",
            }],
        }],
    }, { dependsOn: [dataCollectionRule] });

    const stackDeletionRule = new azure_native.securityinsights.ScheduledAlertRule("stackDeletionRule", {
        resourceGroupName,
        workspaceName,
        kind: "Scheduled",
        displayName: "Pulumi Cloud - Stack Deleted",
        description: "Detects when a Pulumi stack is deleted. Stack deletion is a destructive operation that removes all infrastructure state. This may be legitimate maintenance or could indicate unauthorized activity.",
        severity: "Medium",
        enabled: true,
        query: [
            "PulumiAuditLogs_CL",
            '| where Event_s == "stack-deleted"',
            "| extend AccountCustomEntity = UserLogin_s",
            "| extend IPCustomEntity = SourceIP_s",
        ].join("\n"),
        queryFrequency: "PT5M",
        queryPeriod: "PT5M",
        triggerOperator: "GreaterThan",
        triggerThreshold: 0,
        suppressionDuration: "PT1H",
        suppressionEnabled: false,
        tactics: ["Impact"],
        techniques: ["T1485"],
        entityMappings: [
            {
                entityType: "Account",
                fieldMappings: [{
                    identifier: "Name",
                    columnName: "UserLogin_s",
                }],
            },
            {
                entityType: "IP",
                fieldMappings: [{
                    identifier: "Address",
                    columnName: "SourceIP_s",
                }],
            },
        ],
    }, { dependsOn: [table, dataCollectionRule] });

    const orgMemberChangeRule = new azure_native.securityinsights.ScheduledAlertRule("orgMemberChangeRule", {
        resourceGroupName,
        workspaceName,
        kind: "Scheduled",
        displayName: "Pulumi Cloud - Organization Membership Change",
        description: "Detects when organization membership changes occur, including members being added, removed, or having their roles changed. These events are important for tracking access control changes to your infrastructure management platform.",
        severity: "Low",
        enabled: true,
        query: [
            "PulumiAuditLogs_CL",
            '| where Event_s in ("member-added", "member-removed", "member-role-changed")',
            "| extend AccountCustomEntity = UserLogin_s",
            "| extend IPCustomEntity = SourceIP_s",
        ].join("\n"),
        queryFrequency: "PT5M",
        queryPeriod: "PT5M",
        triggerOperator: "GreaterThan",
        triggerThreshold: 0,
        suppressionDuration: "PT1H",
        suppressionEnabled: false,
        tactics: ["Persistence"],
        techniques: ["T1098"],
        entityMappings: [
            {
                entityType: "Account",
                fieldMappings: [{
                    identifier: "Name",
                    columnName: "UserLogin_s",
                }],
            },
            {
                entityType: "IP",
                fieldMappings: [{
                    identifier: "Address",
                    columnName: "SourceIP_s",
                }],
            },
        ],
    }, { dependsOn: [dataCollectionRule] });

} // enableAnalyticRules

// ---------------------------------------------------------------------------
// Outputs
// ---------------------------------------------------------------------------

export const dataCollectionEndpointUrl = dataCollectionEndpoint.logsIngestion.apply((li: any) => li?.endpoint);
export const dataCollectionRuleId = dataCollectionRule.id;
export const tableId = table.id;
export const connectorDefinitionId = connectorDefinition.id;
export const dataConnectorId = dataConnector.id;
