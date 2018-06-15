const cloud = require("@pulumi/cloud-aws");

// Create a mapping from 'route' to a count
let counterTable = new cloud.Table("counterTable", "route");

// Create an API endpoint
let endpoint = new cloud.API("hello-world");

endpoint.get("/{route+}", (req, res) => {
    let route = req.params["route"];
    console.log(`Getting count for '${route}'`);

    // get previous value and increment
    // reference outer `counterTable` object
    counterTable.get({ route }).then(value => {
        let count = (value && value.count) || 0;
        counterTable.insert({ route, count: ++count }).then(() => {
            res.status(200).json({ route, count });
            console.log(`Got count ${count} for '${route}'`);
        });
    });
});

exports.endpoint = endpoint.publish().url;
