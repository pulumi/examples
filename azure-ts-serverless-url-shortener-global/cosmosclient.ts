import * as cosmos from "@azure/cosmos";

export async function getContainer(endpoint: string, masterKey: string, region: string) {
    let connectionPolicy = new cosmos.ConnectionPolicy();
    connectionPolicy.PreferredLocations = [region];
    
    const client = new cosmos.CosmosClient({
        endpoint,
        auth: { masterKey: masterKey },
        connectionPolicy,
    });

    const { database: db } = await client.databases.createIfNotExists({ id: "thedb" });
    const { container } = await db.containers.createIfNotExists({ id: "urls" });
    return container;
}
