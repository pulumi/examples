const cloud = require("@pulumi/cloud");
const express = require("express");

// Create a mapping from 'route' to a count
let counterTable = new cloud.Table("counterTable", "route");

// Create an HTTP server using Express
let routeCountServer = new cloud.HttpServer("routecount", () => {
    let app = express();
    
    // Handle any route, incrementing count of times that route has been requested
    app.get("*", (req, res) => {
        let route = req.path;
        console.log(`Getting count for '${route}'`);

        // Increment count in the counter Table created above
        counterTable.get({ route }).then(value => {
            let count = (value && value.count) || 0;
            return counterTable.insert({ route, count: ++count }).then(() => {
                res.status(200).json({ route, count });
                console.log(`Got count ${count} for '${route}'`);
            });
        }).catch(err => {
            res.status(500).send(err.toString());
            console.error(`Failed to get count for '${route}': ${err.toString()}`);
        });
    });

    return app;
});

exports.endpoint = routeCountServer.url;
