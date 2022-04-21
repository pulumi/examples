var AWS = require('aws-sdk');
var fs = require('fs');
var util = require('util')

AWS.config.update({region: process.env.CANARY_REGION})

var lambda = new AWS.Lambda()

var layers2Delete = []
lambda.listLayers({}, function(err, data) {
  if (err) fs.writeFileSync("./listLayersError.output", err.toString())
  else {
    fs.writeFileSync("./listLayers.output", util.inspect(data))
    data.Layers.forEach(layer => {
      fs.appendFileSync("./foreachstuff.output", layer.LatestMatchingVersion.LayerVersionArn)
      // layers2Delete.push(`${layer.LayerArn}:${layer.LatestMatchingVersion}`)
      layers2Delete.push(layer.LatestMatchingVersion.LayerVersionArn)
    })
  }
});

fs.writeFileSync("./layers2Delete.output", util.inspect(layers2Delete))
