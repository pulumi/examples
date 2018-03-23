const webserver = require("./webserver.js");

let webInstance = webserver.createInstance("web-server-www", "t2.nano");
let appInstance = webserver.createInstance("web-server-app", "t2.micro");

exports.webUrl = webInstance.publicDns.apply(dns => `http://${dns}`); // apply transformation to output property
