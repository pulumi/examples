// let serverless = require("@pulumi/aws-serverless");
let serverless = require("./serverless");

// Register all of the todo CRUD routes on an RESTful API endpoint.
let api = new serverless.API("todos-api");
api.post("create", "/todos", { cors: true }, require("./todos/create").create);
api.get("list", "/todos", { cors: true }, require("./todos/list").list);
api.get("get", "/todos/{id}", { cors: true }, require("./todos/get").get);
api.put("update", "/todos/{id}", { cors: true }, require("./todos/update").update);
api.delete("delete", "/todos/{id}", { cors: true }, require("./todos/delete").delete);
module.exports.url = api.publish();
