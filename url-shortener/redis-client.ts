import * as cloud from "@pulumi/cloud";

let clients: { [key: string]: any} = {};

export function redisClient(endpoint: cloud.Endpoint, password: string) {
    console.log(`Endpoint: ${JSON.stringify(endpoint)}`);
    
    let hostAndPort = endpoint.hostname + endpoint.port;
    let client = clients[hostAndPort];
    
    if (!client) {  
        console.log("Client was NOT cached");

        client = require("redis").createClient(
            endpoint.port,
            endpoint.hostname,
            { password: password },
        );
    }

    console.log(client);

    clients[hostAndPort] = client;
    return client;
}