// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as azure from "@pulumi/azure";
import * as pulumi from "@pulumi/pulumi";

import * as cdnManagement from "@azure/arm-cdn";
import { ServiceClientCredentials } from "@azure/ms-rest-js";
import * as msRestAzure from "@azure/ms-rest-nodeauth";

/**
 * CustomDomainOptions represents the inputs to the dynamic resource.
 * Any property of type `Input<T>` will automatically be resolved to their type `T`
 * by the custom dynamic resource before passing them to the functions in the
 * dynamic resource provider.
 */
export interface CustomDomainOptions {
    resourceGroupName: pulumi.Input<string>;
    profileName: pulumi.Input<string>;
    endpointName: pulumi.Input<string>;
    customDomainHostName: pulumi.Input<string>;
    httpsEnabled: pulumi.Input<boolean>;
}

/**
 * DynamicProviderInputs represents the inputs that are passed as inputs
 * to each function in the implementation of a `pulumi.dynamic.ResourceProvider`.
 * The property names in this must match `CustomDomainOptions`.
 */
interface DynamicProviderInputs {
    resourceGroupName: string;
    profileName: string;
    endpointName: string;
    customDomainHostName: string;
    httpsEnabled: boolean;
}

/**
 * DynamicProviderOutputs represents the output type of `create` function in the
 * dynamic resource provider.
 */
interface DynamicProviderOutputs extends DynamicProviderInputs, cdnManagement.CdnManagementModels.CustomDomainsCreateResponse {
    name: string;
}

class CDNCustomDomainResourceProvider implements pulumi.dynamic.ResourceProvider {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    private async getCDNManagementClient(): Promise<cdnManagement.CdnManagementClient> {
        let clientID = azure.config.clientId;
        let clientSecret = azure.config.clientSecret;
        let tenantID = azure.config.tenantId;
        let subscriptionID = azure.config.subscriptionId;
        let credentials: ServiceClientCredentials;

        // If at least one of them is empty, try looking at the env vars.
        if (!clientID || !clientSecret || !tenantID || !subscriptionID) {
            await pulumi.log.info("Checking env vars for ARM credentials.", undefined, undefined, true);
            clientID = process.env["ARM_CLIENT_ID"];
            clientSecret = process.env["ARM_CLIENT_SECRET"];
            tenantID = process.env["ARM_TENANT_ID"];
            subscriptionID = process.env["ARM_SUBSCRIPTION_ID"];
        }

        // If they are still empty, try to get the creds from Az CLI.
        if (!clientID || !clientSecret || !tenantID || !subscriptionID) {
            await pulumi.log.info("Env vars did not contain ARM credentials. Trying Az CLI.", undefined, undefined, true);
            // `create()` will throw an error if the Az CLI is not installed or `az login` has never been run.
            const cliCredentials = await msRestAzure.AzureCliCredentials.create();
            subscriptionID = cliCredentials.subscriptionInfo.id;
            credentials = cliCredentials;
            await pulumi.log.info("Using credentials from Az CLI.", undefined, undefined, true);
        } else {
            credentials = await msRestAzure.loginWithServicePrincipalSecret(clientID, clientSecret, tenantID);
        }

        return new cdnManagement.CdnManagementClient(credentials, subscriptionID);
    }

    async check(olds: DynamicProviderInputs, news: DynamicProviderInputs): Promise<pulumi.dynamic.CheckResult> {
        // If none of the CDN properties changed, then there is nothing to be validated.
        if (olds.profileName === news.profileName &&
            olds.endpointName === news.endpointName &&
            olds.customDomainHostName === news.customDomainHostName) {
            return { inputs: news };
        }

        const failures: pulumi.dynamic.CheckFailure[] = [];
        if (!news.endpointName) {
            failures.push({
                property: "endpointName",
                reason: "endpointName is required",
            });
        }
        if (!news.profileName) {
            failures.push({
                property: "profileName",
                reason: "profileName is required",
            });
        }
        if (!news.customDomainHostName) {
            failures.push({
                property: "customDomainHostName",
                reason: "customDomainHostName is required",
            });
        }

        if (failures.length > 0) {
            return { failures: failures };
        }

        return { inputs: news };
    }

    async diff(id: string, previousOutput: DynamicProviderOutputs, news: DynamicProviderInputs): Promise<pulumi.dynamic.DiffResult> {
        const replaces: string[] = [];
        let changes = false;
        let deleteBeforeReplace = false;

        if (previousOutput.customDomainHostName !== news.customDomainHostName || previousOutput.name !== this.name) {
            await pulumi.log.warn("Changing the domain name properties will cause downtime.", undefined, undefined, true);

            changes = true;
            deleteBeforeReplace = true;
            if (previousOutput.customDomainHostName !== news.customDomainHostName) {
                replaces.push("customDomainHostName");
            }
            if (previousOutput.name !== this.name) {
                replaces.push("customDomainName");
            }
        }

        if (previousOutput.endpointName !== news.endpointName) {
            changes = true;
            deleteBeforeReplace = true;
            replaces.push("endpointName");
        }

        // HTTPS can be enabled/disabled in-place.
        if (previousOutput.httpsEnabled !== news.httpsEnabled) {
            changes = true;
            replaces.push("httpsEnabled");
        }

        return {
            deleteBeforeReplace: deleteBeforeReplace,
            replaces: replaces,
            changes: changes,
        };
    }

    async create(inputs: DynamicProviderInputs): Promise<pulumi.dynamic.CreateResult> {
        const cdnClient = await this.getCDNManagementClient();

        const validationOutput = await cdnClient.endpoints.validateCustomDomain(
            inputs.resourceGroupName,
            inputs.profileName,
            inputs.endpointName,
            inputs.customDomainHostName);
        if (!validationOutput.customDomainValidated) {
            throw new Error(`Validation of custom domain failed with ${validationOutput.reason}`);
        }

        const result =
            await cdnClient.customDomains.create(
                inputs.resourceGroupName,
                inputs.profileName,
                inputs.endpointName,
                this.name,
                inputs.customDomainHostName);

        if (inputs.httpsEnabled) {
            await pulumi.log.info("Enabling HTTPS for the custom domain", undefined, undefined, true);

            await cdnClient.customDomains.enableCustomHttps(
                inputs.resourceGroupName,
                inputs.profileName,
                inputs.endpointName,
                this.name,
                {
                    customDomainHttpsParameters: {
                        certificateSource: "Cdn",
                        certificateSourceParameters: {
                            certificateType: "Dedicated",
                        },
                        protocolType: "ServerNameIndication",
                    },
                });
        }

        const outs: DynamicProviderOutputs = {
            ...result,
            name: this.name,
            resourceGroupName: inputs.resourceGroupName,
            profileName: inputs.profileName,
            endpointName: inputs.endpointName,
            customDomainHostName: inputs.customDomainHostName,
            httpsEnabled: inputs.httpsEnabled,
        };

        return { id: result.id!, outs: outs };
    }

    async read(id: string, props: DynamicProviderOutputs): Promise<pulumi.dynamic.ReadResult> {
        const cdnClient = await this.getCDNManagementClient();
        const result = await cdnClient.customDomains.get(props.resourceGroupName, props.profileName, props.endpointName, this.name);
        return {
            id: result.id,
            props: { ...props, ...result },
        };
    }

    async delete(id: string, props: DynamicProviderOutputs): Promise<void> {
        const cdnClient = await this.getCDNManagementClient();
        const result = await cdnClient.customDomains.deleteMethod(props.resourceGroupName, props.profileName, props.endpointName, this.name);
        if (result._response.status >= 400) {
            throw new Error("Error response received while trying to delete the custom domain.");
        }
        if (!result.resourceState) {
            return;
        }
        if (result.resourceState !== "Deleting") {
            throw new Error(`Provisioning state of the custom domain was expected to be 'Deleting', but was ${result.resourceState}.`);
        }

        await pulumi.log.info(
            "The request to delete was successful. However, it can take a minute or two to fully complete deletion.",
            undefined,
            undefined,
            true);
    }

    /**
     * The only thing that the update method really updates in the custom domain is the HTTPS enablement.
     */
    async update(id: string, currentOutputs: DynamicProviderOutputs, newInputs: DynamicProviderInputs): Promise<pulumi.dynamic.UpdateResult> {
        const cdnClient = await this.getCDNManagementClient();
        if (newInputs.httpsEnabled) {
            await cdnClient.customDomains.enableCustomHttps(
                newInputs.resourceGroupName,
                newInputs.profileName,
                newInputs.endpointName,
                this.name,
                {
                    customDomainHttpsParameters: {
                        certificateSource: "Cdn",
                        certificateSourceParameters: {
                            certificateType: "Dedicated",
                        },
                        protocolType: "ServerNameIndication",
                    },
                });

            currentOutputs.httpsEnabled = true;
            return { outs: currentOutputs };
        }

        await cdnClient.customDomains.disableCustomHttps(
            newInputs.resourceGroupName,
            newInputs.profileName,
            newInputs.endpointName,
            this.name);

        currentOutputs.httpsEnabled = false;
        return { outs: currentOutputs };
    }
}

/**
 * CDNCustomDomainResource is a resource that can be used to create
 * custom domains against Azure CDN resources.
 * The Azure CDN resource itself must exist in order to create a custom domain for it.
 *
 * Outputs from the dynamic resource provider must be declared in the dynamic resource itself
 * as `public readonly` members with the type `Output<T>`. These are automatically set by the dynamic
 * provider engine. The names of these properties must match the names of the properties exactly as
 * returned in the outputs of the dynamic resource provider functions.
 */
export class CDNCustomDomainResource extends pulumi.dynamic.Resource {
    /**
     * These are the same properties that were originally passed as inputs, but available as outputs
     * for convenience. The names of these properties must match with `CustomDomainOptions`.
     */
    public readonly resourceGroupName: pulumi.Output<string>;
    public readonly profileName: pulumi.Output<string>;
    public readonly endpointName: pulumi.Output<string>;
    public readonly customDomainHostName: pulumi.Output<string>;
    public readonly httpsEnabled: pulumi.Output<boolean>;

    // The following are properties set by the CDN rest client.
    public readonly customHttpsProvisioningState: pulumi.Output<cdnManagement.CdnManagementModels.CustomHttpsProvisioningState>;
    public readonly customHttpsProvisioningSubstate: pulumi.Output<cdnManagement.CdnManagementModels.CustomHttpsProvisioningSubstate>;
    public readonly provisioningState: pulumi.Output<string>;
    public readonly resourceState: pulumi.Output<cdnManagement.CdnManagementModels.CustomDomainResourceState>;
    public readonly type: pulumi.Output<string>;

    constructor(name: string, args: CustomDomainOptions, opts?: pulumi.CustomResourceOptions) {
        super(new CDNCustomDomainResourceProvider(name), `azure:cdn:Endpoint:CustomDomains:${name}`, args, opts);
    }
}
