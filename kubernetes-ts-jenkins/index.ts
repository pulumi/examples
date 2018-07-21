import * as pulumi from "@pulumi/pulumi";
import * as jenkins from "./jenkins";

const config = new pulumi.Config("jenkins");
const instance = new jenkins.Instance({
    name: pulumi.getStack(),
    credentials: {
        username: config.require("username"),
        password: config.require("password"),
    },
    resources: {
        memory: "512Mi",
        cpu: "100m",
    }
});
