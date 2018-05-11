const cloud = require("@pulumi/cloud-aws");

// Create a mapping from 'route' to a count
let counterTable = new cloud.Table("counterTable", "route");

// Create an API endpoint
let endpoint = new cloud.HttpEndpoint("hello-world");

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

module.exports.endpoint = endpoint.publish().url;
