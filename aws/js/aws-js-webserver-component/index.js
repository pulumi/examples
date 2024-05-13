const pulumi = require("@pulumi/pulumi");

const webserver = require("./webserver.js");

let webInstance = webserver.createInstance("web-server-www", "t2.nano");
let appInstance = webserver.createInstance("web-server-app", "t2.micro");

exports.webUrl = pulumi.interpolate `http://${webInstance.publicDns}`;
