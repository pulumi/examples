// Copyright 2016-2018, Pulumi Corporation.  All rights reserved.

// Note: @pulumi/cloud is a preview package demonstrating how to create cross-cloud Pulumi
// components. If you are targeting a specific cloud like AWS, Azure, or GCP, we recommend you use
// platform-specific packages like @pulumi/aws, @pulumi/azure or @pulumi/gcp. These packages give
// you full access to the breadth of the platform's capabilities and comes with many abstractions to
// make developing against that platform easier.

import * as cloud from "@pulumi/cloud-aws";

// Create a web server.
const endpoint = new cloud.API("urlshortener");

// Create a table `urls`, with `name` as primary key.
const urlTable = new cloud.Table("urls", "name");

// Serve all files in the www directory to the root.
endpoint.static("/", "www");

// GET /url lists all URLs currently registered.
endpoint.get("/url", async (req, res) => {
    try {
        const items = await urlTable.scan();
        res.status(200).json(items);
        console.log(`GET /url retrieved ${items.length} items`);
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`GET /url error: ${err.stack}`);
    }
});

// GET /url/{name} redirects to the target URL based on a short-name.
endpoint.get("/url/{name}", async (req, res) => {
    const name = req.params["name"];
    try {
        const value = await urlTable.get({name});
        const url = value && value.url;

        // If we found an entry, 301 redirect to it; else, 404.
        if (url) {
            res.setHeader("Location", url);
            res.status(301);
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
});

// POST /url registers a new URL with a given short-name.
endpoint.post("/url", async (req, res) => {
    const url = req.query["url"];
    const name = req.query["name"];
    try {
        await urlTable.insert({ name, url });
        res.json({ shortenedURLName: name });
        console.log(`POST /url/${name} => ${url}`);
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`POST /url/${name} => ${url} error: ${err.stack}`);
    }
});

export let endpointUrl = endpoint.publish().url;
