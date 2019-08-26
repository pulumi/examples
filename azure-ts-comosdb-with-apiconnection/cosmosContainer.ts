
import * as pulumi from "@pulumi/pulumi";
import * as cosmos from "@azure/cosmos";

/**
 * DynamicProviderInputs represents the inputs that are passed as inputs
 * to each function in the implementation of a `pulumi.dynamic.ResourceProvider`.
 * The property names in this must match `CustomDomainOptions`.
 */
interface DynamicProviderInputs {
    region: string;
    endpoint: string;
    masterKey: string;
    collectionName: string;
    dbName: string;
}

// https://www.typescriptlang.org/docs/handbook/advanced-types.html#mapped-types
type Inputs<T> = {
    [P in keyof T]: pulumi.Input<T[P]>;
}

export type CustomDomainOptions = Inputs<DynamicProviderInputs>;


/**
 * DynamicProviderOutputs represents the output type of `create` function in the
 * dynamic resource provider.
 */
interface DynamicProviderOutputs extends DynamicProviderInputs {
    name: string;
}

class CosmosContainerProvider implements pulumi.dynamic.ResourceProvider {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    public async getCosmosContainerClient(region: string, endpoint: string, masterKey: string, dbName: string) {
        let connectionPolicy = new cosmos.ConnectionPolicy();
        connectionPolicy.PreferredLocations = [region];

        const client = new cosmos.CosmosClient({
            endpoint: endpoint,
            auth: { masterKey: masterKey },
            connectionPolicy,
        });

        return client.database(dbName);
    }

    async diff(id: string, previousOutput: DynamicProviderOutputs, news: DynamicProviderInputs): Promise<pulumi.dynamic.DiffResult> {
        const replaces: string[] = [];
        let changes = false;
        let deleteBeforeReplace = false;

        if (previousOutput.name !== this.name) {
            changes = true;
            deleteBeforeReplace = true;
            replaces.push("name");
        }

        return {
            deleteBeforeReplace: deleteBeforeReplace,
            replaces: replaces,
            changes: changes
        };
    }

    public async create(inputs: DynamicProviderInputs): Promise<pulumi.dynamic.CreateResult> {
        const client = await this.getCosmosContainerClient(inputs.region, inputs.endpoint, inputs.masterKey, inputs.dbName);
        const response = await client.containers.createIfNotExists({ id: inputs.collectionName });
        const container = response.container;

        const outs: DynamicProviderOutputs = {
            name: this.name,
            collectionName: inputs.collectionName,
            region: inputs.region,
            endpoint: inputs.endpoint,
            masterKey: inputs.masterKey,
            dbName: inputs.dbName,
        };

        return { id: container.id!, outs: outs };
    }

    public async delete(id: string, props: DynamicProviderOutputs): Promise<void> {
        const client = await this.getCosmosContainerClient(props.region, props.endpoint, props.masterKey, props.dbName);
        const response = await client.container(props.collectionName).delete();

        await pulumi.log.info(
            "The request to delete was successful. However, it can take a minute or two to fully complete deletion.",
            undefined,
            undefined,
            true
        );
    }
}

export class CosmosContainer extends pulumi.dynamic.Resource {
    public readonly collectionName: pulumi.Output<string>;

    constructor(name: string, args: CustomDomainOptions, opts?: pulumi.CustomResourceOptions) {
        super(new CosmosContainerProvider(name), name, args, opts);
    }
}
