import * as pulumi from "@pulumi/pulumi";
import * as jenkins from "./jenkins";

const config = new pulumi.Config("jenkins");
const instance = new jenkins.Instance("jenkins", {
    name: "jenkins",
    credentials: {
        username: config.require("username"),
        password: config.require("password"),
    },
    resources: {
        memory: "512Mi",
        cpu: "100m",
    }
});
