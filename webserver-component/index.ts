import * as aws from "@pulumi/aws";
import * as webserver from "./webserver"; // use the new custom component
import { Output } from "@pulumi/pulumi"; // for output property

let webInstance = webserver.createInstance("web-server-www", "t2.nano");
let appInstance = webserver.createInstance("web-server-app", "t2.micro");

export let webUrl = webInstance.publicDns.apply(dns => `http://${dns}`);
