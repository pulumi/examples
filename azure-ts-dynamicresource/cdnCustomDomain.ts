import * as pulumi from "@pulumi/pulumi";
import * as azure from "@pulumi/azure";

import * as msRestAzure from "@azure/ms-rest-nodeauth";
import * as cdnManagement from "@azure/arm-cdn";
import { ServiceClientCredentials } from "@azure/ms-rest-js";

export interface CustomDomainOptions {
  resourceGroupName: string;
  profileName: string;
  endpointName: string;
  customDomainHostName: string;
  httpsEnabled: boolean;
}

export interface CustomDomainOutputs extends cdnManagement.CdnManagementModels.CustomDomainsCreateResponse {
  inputs: CustomDomainOptions;
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
      console.log("Checking env vars for ARM credentials.");
      clientID = process.env["ARM_CLIENT_ID"];
      clientSecret = process.env["ARM_CLIENT_SECRET"];
      tenantID = process.env["ARM_TENANT_ID"];
      subscriptionID = process.env["ARM_SUBSCRIPTION_ID"];
    }

    // If they are still empty, then throw an error.
    if (!clientID || !clientSecret || !tenantID || !subscriptionID) {
      const cliCredentials = await msRestAzure.AzureCliCredentials.create();
      subscriptionID = cliCredentials.subscriptionInfo.id;
      credentials = cliCredentials;
    } else {
      credentials = await msRestAzure.loginWithServicePrincipalSecret(clientID, clientSecret, tenantID);
    }

    return new cdnManagement.CdnManagementClient(credentials, subscriptionID);
  }

  async check(olds: CustomDomainOptions, news: CustomDomainOptions): Promise<pulumi.dynamic.CheckResult> {
    const cdnClient = await this.getCDNManagementClient();
    let result: pulumi.dynamic.CheckResult;

    // If none of the CDN properties changed, then there is nothing to be validated.
    if (olds.profileName === news.profileName &&
        olds.endpointName === news.endpointName &&
        olds.customDomainHostName === news.customDomainHostName) {
      return {
        inputs: news
      };
    }

    const validationOutput = await cdnClient.endpoints.validateCustomDomain(
      news.resourceGroupName, news.profileName, news.endpointName, news.customDomainHostName);
    if (!validationOutput.customDomainValidated) {
      result = {
        failures: [
          {
            property: this.name,
            reason: validationOutput.reason || "domain_validation_failed"
          }
        ]
      };
    } else {
      result = {
        inputs: news
      };
    }

    return result;
  }
  async diff(id: string, previousOutput: CustomDomainOutputs, news: CustomDomainOptions): Promise<pulumi.dynamic.DiffResult> {
    const oldInputs = previousOutput.inputs;
    const replaces: string[] = [];
    let changes = false;
    let deleteBeforeReplace = false;

    if (oldInputs.customDomainHostName !== news.customDomainHostName || previousOutput.name !== this.name) {
      console.warn("Changing the domain name properties will cause a downtime.")

      deleteBeforeReplace = true;
      if (oldInputs.customDomainHostName !== news.customDomainHostName) {
        replaces.push("customDomainHostName");
      }
      if (previousOutput.name !== this.name) {
        replaces.push("customDomainName");
      }
    }

    if (oldInputs.endpointName !== news.endpointName) {
      deleteBeforeReplace = true;
      replaces.push("endpointName");
    }

    // HTTPS can be enabled/disabled in-place.
    if (oldInputs.httpsEnabled !== news.httpsEnabled) {
      changes = true;
      replaces.push("httpsEnabled");
    }

    return {
      deleteBeforeReplace: deleteBeforeReplace,
      replaces: replaces,
      changes: changes
    };
  }

  async create(inputs: CustomDomainOptions): Promise<pulumi.dynamic.CreateResult> {
    const cdnClient = await this.getCDNManagementClient();
    const result =
    await cdnClient.customDomains
      .create(
        inputs.resourceGroupName,
        inputs.profileName,
        inputs.endpointName,
        this.name,
        inputs.customDomainHostName);
    console.log(`Custom domain provisioning state is ${ result.resourceState }.`);

    if (inputs.httpsEnabled) {
      console.log("Enabling HTTPS now");

      await cdnClient.customDomains
      .enableCustomHttps(
        inputs.resourceGroupName,
        inputs.profileName,
        inputs.endpointName,
        this.name);
    }

    const outs = {
      ...result,
      name: this.name,
      inputs: {
        resourceGroupName: inputs.resourceGroupName,
        profileName: inputs.profileName,
        endpointName: inputs.endpointName,
        customDomainHostName: inputs.customDomainHostName,
        httpsEnabled: inputs.httpsEnabled,
      },
    };

    return {
      id: result.id!,
      outs: outs
    };
  }

  async read(id: string, props: any): Promise<pulumi.dynamic.ReadResult> {
    const inputs = props.inputs as CustomDomainOptions;
    const cdnClient = await this.getCDNManagementClient();
    const result = await cdnClient.customDomains.get(inputs.resourceGroupName, inputs.profileName, inputs.endpointName, this.name);
    return {
      id: result.id,
      props: { ...result, inputs: { ...inputs }}
    };
  }

  async delete(id: string, props: any): Promise<void> {
    const inputs = props.inputs as CustomDomainOptions;
    const cdnClient = await this.getCDNManagementClient();
    try {
      const result = await cdnClient.customDomains.deleteMethod(inputs.resourceGroupName, inputs.profileName, inputs.endpointName, this.name);
      if (result._response.status >= 400) {
        throw new Error("Error response received while trying to delete the custom domain.");
      }

      if (!result.resourceState) {
        return;
      }
      if (result.resourceState !== 'Deleting') {
        throw new Error(`Provisioning state of the custom domain was expected to be 'Deleting', but was ${ result.resourceState }.`);
      }

      console.log("The request to delete was successful. However, it can take a minute or two to fully complete deletion.");
    } catch (err) {
      // Due to a bug in the Azure CDN SDK, deletion will result in a 404 even though it succeeded.
      // This console.log statement will at least keep the user aware of the problem.
      // Once the bug is fixed in the SDK, we should never hit this unless the custom domain to be deleted
      // cannot be genuinely found.
      // See: https://github.com/Azure/azure-sdk-for-js/issues/2842.
      console.log(err);
    }
  }

  /**
   * The only thing that the update method really updates in the custom domain is the HTTPS enablement.
   */
  async update (id: string, currentOutputs: CustomDomainOutputs, newInputs: CustomDomainOptions): Promise<pulumi.dynamic.UpdateResult> {
    const cdnClient = await this.getCDNManagementClient();
    if (newInputs.httpsEnabled) {
      await cdnClient.customDomains
        .enableCustomHttps(
          newInputs.resourceGroupName,
          newInputs.profileName,
          newInputs.endpointName,
          this.name);
      
      currentOutputs.inputs.httpsEnabled = true;
      return {
        outs: currentOutputs
      };
    }

    await cdnClient.customDomains
      .disableCustomHttps(
        newInputs.resourceGroupName,
        newInputs.profileName,
        newInputs.endpointName,
        this.name);

    currentOutputs.inputs.httpsEnabled = true;
    return {
      outs: currentOutputs
    };
  }
}

/**
 * CDNCustomDomainResource is a resource that can be used to create
 * custom domains against Azure CDN resources.
 * The Azure CDN resource itself must exist in order to create a custom domain for it.
 */
export class CDNCustomDomainResource extends pulumi.dynamic.Resource {
  constructor(name: string, args: CustomDomainOptions, opts?: pulumi.CustomResourceOptions) {
    super(new CDNCustomDomainResourceProvider(name), `azure:cdn:Endpoint:CustomDomains:${name}`, args, opts);
  }
}
