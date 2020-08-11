// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as crontabs from "./crontabs";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

/*
Without crd2pulumi, we would have to write the following to create the CRD and
provision an instance of it:

const cronTabDefinition = new k8s.apiextensions.v1.CustomResourceDefinition(
    "my-crontab-definition",
    {
        metadata: {
            name: "crontabs.stable.example.com",
        },
        spec: {
            group: "stable.example.com",
            versions: [{
                name: "v1",
                served: true,
                storage: true,
                schema: {
                    openAPIV3Schema: {
                        type: "object",
                        properties: {
                            spec: {
                                type: "object",
                                properties: {
                                    cronSpec: {
                                        type: "string"
                                    },
                                    image: {
                                        type: "string"
                                    },
                                    replicas: {
                                        type: "integer"
                                    }
                                }
                            }
                        }
                    }
                }
            }],
            scope: "Namespaced",
            names: {
                plural: "crontabs",
                singular: "crontab",
                kind: "CronTab",
                shortNames: [ "ct" ]
            }
        }
    }
)
*/

// const myCronTab = new k8s.apiextensions.CustomResource(
//    "my-new-cron-object",
//    {
//        apiVersion: "stable.example.com/v1",
//        kind: "CronTab",
//        metadata: {
//            name: "my-new-cron-object",
//        },  
//        spec: {
//            cronSpec: "* * * * */5",
//            image: "my-awesome-cron-image"
//        }
//    }
// )

const cronTabDefinition = new crontabs.CronTabDefinition("my-crontab-definition")

const myCronTab = new crontabs.v1.CronTab("my-new-cron-object",
{
    metadata: {
        name: "my-new-cron-object",
    },
    spec: {
        cronSpec: "* * * * */5",
        image: "my-awesome-cron-image",
    }
});

export const urn = myCronTab.urn;
