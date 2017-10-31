import * as aws from "@pulumi/aws";
import * as webserver from "./webserver"; // use our custom component

(async () => {
    let zones: string[] = (await aws.getAvailabilityZones()).names;
    for (let i = 0; i < zones.length; i++) {
        let server = webserver.createInstance("web-server-www-" + i, "t2.micro", zones[i]);
    }
})();