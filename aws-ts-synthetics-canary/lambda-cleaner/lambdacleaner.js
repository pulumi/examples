var AWS = require('aws-sdk')
var fs = require('fs')

AWS.config.update({region: process.env.CANARY_REGION})

var lambda = new AWS.Lambda()
var params = {
  FunctionName: process.env.CANARY_LAMBDA_FN_NAME
}
lambda.deleteFunction(params, function(err, data) {
  if (err) fs.writeFileSync("./lambdaDeleteError.output", err.toString());
  else fs.writeFileSync("./lambdaDeleteSuccess.output", data.toString());
});

lambda.listLayers({}, function(err, data) {
  if (err) console.log(err, err.stack);
  else console.log(data)
});
