import * as cosmos from "@azure/cosmos";

export async function getContainer(endpoint: string, masterKey: string, region: string) {
    const client = new cosmos.CosmosClient({
        endpoint,
        key: masterKey,
        connectionPolicy: { preferredLocations: [region] },
    });

    const db = client.database("thedb");
    const { container } = await db.containers.createIfNotExists({ id: "urls" });
    return container;
}
