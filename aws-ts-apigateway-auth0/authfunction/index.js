// Code copied directly from Auth0's Guide
// https://github.com/auth0-samples/jwt-rsa-aws-custom-authorizer
const lib = require('./lib');
let data;

// Lambda function index.handler - thin wrapper around lib.authenticate
module.exports.handler = async (event) => {
    try {
        data = await lib.authenticate(event);
    }
    catch (err) {
        console.log(err);
        return `Unauthorized: ${err.message}`;
    }
    return data;
};