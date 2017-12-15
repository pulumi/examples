import * as aws from "@pulumi/aws";
import * as webserver from "./webserver"; // use the new custom component

let webInstance = webserver.createInstance("web-server-www", "t2.micro");
let appInstance = webserver.createInstance("web-server-app", "t2.nano");