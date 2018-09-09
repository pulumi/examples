# Serverless REST API

This example demonstrates how to set up a [RESTful Web Service](
https://en.wikipedia.org/wiki/Representational_state_transfer#Applied_to_web_services) allowing you to create, list,
get, update, and delete Todos.  DynamoDB is used to store the data.  This is just an example and of course you could
use any API endpoints and data storage provider as a backend.

This specific example only runs on AWS, although one could, if so desired, convert it to using
[Pulumi's cloud framework](https://github.com/pulumi/pulumi-cloud) for cloud portability.  There is an example of a
similar Todo app that can run on any cloud [here](https://github.com/pulumi/pulumi-cloud/tree/master/examples/todo).

The code in this example is loosely based on the Serverless project's [`aws-node-rest-api-with-dynamodb` example](
https://github.com/serverless/examples/tree/master/aws-node-rest-api-with-dynamodb).
