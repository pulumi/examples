import * as cloud  from "@pulumi/cloud";
import * as pulumi from "@pulumi/pulumi";

// Create an API endpoint
let endpoint = new cloud.HttpEndpoint("hello-world");

// Create a table `counterTable`, with `route` as primary key.
let counterTable = new cloud.Table("counterTable", "route");

endpoint.get("/{route+}", async (req, res) => {
    let route = req.params["route"];
    console.log(`Getting count for '${route}'`);

    // get previous value and increment
    let value = await counterTable.get({route}); // reference outer `counterTable` object
    let count = (value && value.count) || 0;
    await counterTable.insert( { route, count: ++count });

    res.status(200).json({ route, count});
    console.log(`Got count ${count} for '${route}'`);
});

export let url = endpoint.publish().url;
