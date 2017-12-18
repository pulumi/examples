import * as aws from "@pulumi/aws";
import * as webserver from "./webserver"; // use the new custom component

// the async block is currently required, due to the use of `await` 
// this will be improved in the future
(async () => {
    let zones: string[] = (await aws.getAvailabilityZones()).names;
    for (let i = 0; i < zones.length; i++) {
        let server = webserver.createInstance(`web-server-www-${i}`, "t2.micro", zones[i]);
    }
})();    
