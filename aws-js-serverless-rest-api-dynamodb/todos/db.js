let aws = require("@pulumi/aws");

// Create a database to store the todos.
module.exports.table = new aws.dynamodb.Table("todos", {
    attributes: [{
        name: "id",
        type: "S",
    }],
    hashKey: "id",
    readCapacity: 1,
    writeCapacity: 1,
});
