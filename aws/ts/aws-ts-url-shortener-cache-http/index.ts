// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as aws from "@pulumi/aws";
import * as cloud from "@pulumi/cloud-aws";
import * as pulumi from "@pulumi/pulumi";

import * as express from "express";
import * as cache from "./cache";

type AsyncRequestHandler = (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>;

const asyncMiddleware = (fn: AsyncRequestHandler) => {
    return (req: express.Request, res: express.Response, next: express.NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

// Create a table `urls`, with `name` as primary key.
const urlTable = new aws.dynamodb.Table("urls", {
    attributes: [{
        name: "name",
        type: "S",
    }],
    hashKey: "name",
    billingMode: "PAY_PER_REQUEST",
});

async function scanTable() {
    const items: any[] = [];
    const db = new aws.sdk.DynamoDB.DocumentClient();
    const params = {
        TableName: urlTable.name.get(),
        ConsistentRead: true,
        ExclusiveStartKey: undefined,
    };

    do {
        const result = await db.scan(params).promise();
        if (result.Items) {
            items.push(...result.Items);
        }

        params.ExclusiveStartKey = <any>result.LastEvaluatedKey;
    }
    while (params.ExclusiveStartKey !== undefined);

    return items;
}

// Create a cache of frequently accessed urls.
const urlCache = new cache.Cache("urlcache");

// Create a web server.
const httpServer = new cloud.HttpServer("urlshortener", () => {
    const app = express();

    // GET /url lists all URLs currently registered.
    app.get("/url", asyncMiddleware(async (req, res) => {
        try {
            const items = await scanTable();
            res.status(200).json(items);
            console.log(`GET /url retrieved ${items.length} items`);
        } catch (err) {
            res.status(500).json(err.stack);
            console.log(`GET /url error: ${err.stack}`);
        }
    }));

    // GET /url/{name} redirects to the target URL based on a short-name.
    app.get("/url/:name", asyncMiddleware(async (req, res) => {
        const name = req.params.name;
        try {
            // First try the Redis cache.
            let url = await urlCache.get(name);
            if (url) {
                console.log(`Retrieved value from Redis: ${url}`);
                res.setHeader("X-Powered-By", "redis");
            }
            else {
                // If we didn't find it in the cache, consult the table.
                const db = new aws.sdk.DynamoDB.DocumentClient();
                const result = await db.get({
                    TableName: urlTable.name.get(),
                    Key: {name},
                    ConsistentRead: true,
                }).promise();

                const value = result.Item;
                url = value && value.url;
                if (url) {
                    urlCache.set(name, url); // cache it for next time.
                }
            }

            // If we found an entry, 301 redirect to it; else, 404.
            if (url) {
                res.setHeader("Location", url);
                res.status(302);
                res.end("");
                console.log(`GET /url/${name} => ${url}`);
            }
            else {
                res.status(404);
                res.end("");
                console.log(`GET /url/${name} is missing (404)`);
            }
        } catch (err) {
            res.status(500).json(err.stack);
            console.log(`GET /url/${name} error: ${err.stack}`);
        }
    }));

    // POST /url registers a new URL with a given short-name.
    app.post("/url", asyncMiddleware(async (req, res) => {
        const url = <string>req.query["url"];
        const name = <string>req.query["name"];
        try {
            const db = new aws.sdk.DynamoDB.DocumentClient();
            await db.put({
                TableName: urlTable.name.get(),
                Item: { name, url },
            }).promise();
            await urlCache.set(name, url);
            res.json({ shortenedURLName: name });
            console.log(`POST /url/${name} => ${url}`);
        } catch (err) {
            res.status(500).json(err.stack);
            console.log(`POST /url/${name} => ${url} error: ${err.stack}`);
        }
    }));

    // Serve all files in the www directory to the root.
    // Note: www will be auto-included using config. either
    //      cloud-aws:functionIncludePaths or

    // staticRoutes(app, "/", "www");
    app.use("/", express.static("www"));

    app.get("*", (req, res) => {
        res.json({ uncaught: { url: req.url, baseUrl: req.baseUrl, originalUrl: req.originalUrl, version: process.version } });
    });

    return app;
});

export let endpointUrl = pulumi.interpolate `${httpServer.url}index.html`;
