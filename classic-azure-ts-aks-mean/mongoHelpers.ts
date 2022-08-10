// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

export function parseConnString(
    conns: pulumi.Output<string[]>,
): pulumi.Output<{ [key: string]: string }> {
    // Per the official docs[1], the format of this connection string is:
    //
    //   mongodb://username:password@host:port/[database]?ssl=true
    //
    // Where these could have the following values:
    //
    //   {
    //     username: "cosmosdb93a4133a",
    //     password: "23maXrWsrzZ1LmPe4w6XNGRJJTHsqGZPDTjyVQNbPaw119KCoCNpStH0DQms5MKdyAecisBM9uWbpV7lUnyNeQ==",
    //     host: "cosmosdb93a4133a.documents.azure.com",
    //     port: "10255",
    //     database: "mydatabase"
    //   }
    //
    // There are a few subtleties involved in getting the Bitnami node Chart to actually be able to
    // use this:
    //
    //   1. The `database` field is optional, we default to `test`, as the API expects.
    //   2. The node Chart expects the components of this connection string to be parsed and
    //      presented in files in a `Secret`. The CosmosDb API doesn't natively expose this, so we
    //      must parse it ourselves.
    //   3. The node Chart uses mongoose to speak the MongoDB wire protocol to CosmosDB. Mongoose
    //      fails to parse base64-encoded passwords because it doesn't like the `=` character. This
    //      means we have to (1) URI-encode the password component ourselves, and (2) base64-encode
    //      that URI-encoded password, because this is the format Kubernetes expects.
    //
    // [1]: https://docs.microsoft.com/en-us/azure/cosmos-db/connect-mongodb-account

    function toBase64(s: string): string {
        return Buffer.from(s).toString("base64");
    }

    const retVal: pulumi.Output<{ [key: string]: string }>  = conns.apply(conns => {

        const conn = conns[0] ?? "mongodb://username:password@host:port/[database]?ssl=true";
        const noProtocol = conn.replace(/^mongodb\:\/\//, "");
        const [username, rest1, rest2] = noProtocol.split(":", 3);
        const [password, host] = rest1.split("@", 2);
        const [port, rest3] = rest2.split("/", 2);
        const database = rest3.replace(/\?ssl=true$/, "");
        const connector: { [key: string]: string } = {
            host: toBase64(host),
            port: toBase64(port),
            username: toBase64(username),
            password: toBase64(encodeURIComponent(password)),
            database: toBase64(database === "" ? "test" : database),
        };
        return connector;
    });
    return retVal;
}
