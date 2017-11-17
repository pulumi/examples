// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as cloud from "@pulumi/cloud";
import * as cache from "./cache";

// Create a web server, table of URLs, and a cache for our app.
let app = new cloud.HttpEndpoint("urlshortener");
let urls = new cloud.Table("urls", "name");
let urlCache = new cache.Cache("urlcache");

// Serve all files in the www directory to the root.
app.static("/", "www");

// GET /url lists all URLs currently registered.
app.get("/url", async (req, res) => {
    try {
        let items = await urls.scan();
        res.status(200).json(items);
        console.log(`GET /url retrieved ${items.length} items`);
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`GET /url error: ${err.stack}`);
    }
});

// GET /url/{name} redirects to the target URL based on a short-name.
app.get("/url/{name}", async (req, res) => {
    let name = req.params["name"];
    try {
        // First try the Redis cache.
        let url = await urlCache.get(name);
        if (url) {
            console.log(`Retrieved value from Redis: ${url}`);
            res.setHeader("X-Powered-By", "redis");
        }
        else {
            // If we didn't find it in the cache, consult the table.
            let value = await urls.get({name});
            url = value && value.url;
            if (url) {
                urlCache.set(name, url); // cache it for next time.
            }
        }

        // If we found an entry, 301 redirect to it; else, 404.
        if (url) {
            res.setHeader("Location", url);
            res.status(301);
            res.end("");
            console.log(`GET /url/${name} => ${url}`)
        }
        else {
            res.status(404);
            res.end("");
            console.log(`GET /url/${name} is missing (404)`)
        }
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`GET /url/${name} error: ${err.stack}`);
    }
});

// POST /url registers a new URL with a given short-name.
app.post("/url", async (req, res) => {
    let url = req.query["url"];
    let name = req.query["name"];
    try {
        await urls.insert({ name, url });
        res.json({ shortenedURLName: name });
        console.log(`POST /url/${name} => ${url}`);
    } catch (err) {
        res.status(500).json(err.stack);
        console.log(`POST /url/${name} => ${url} error: ${err.stack}`);
    }
});

app.publish().url.then(url => {
    if (url) {
        console.log(`Serving at: ${url}`);
    }
});
