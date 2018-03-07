import * as aws from "@pulumi/aws";
import * as webserver from "./webserver"; // use the new custom component
import * as pulumi from "@pulumi/pulumi";

// the async block is required since `getAvailabilityZones` returns a promise
export let serverUrls = (async () => {
    let zones: string[] = (await aws.getAvailabilityZones()).names;
    let urls: pulumi.Output<string>[] = []; // save the URL of each created instance

    for (let i = 0; i < zones.length; i++) {
        let server = webserver.createInstance(`web-server-www-${i}`, "t2.micro", zones[i]);
        urls.push(server.publicDns.apply(dns => `http://${dns}`));
    }

    return urls;
})();    

