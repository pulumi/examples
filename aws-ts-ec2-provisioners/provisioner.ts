// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as uuid from "uuid";

// Provisioner lets a custom action run the first time a resource has been created. It takes as input
// a dependent property. Anytime its value changes, the resource is replaced and will re-run its logic.
export class Provisioner<T> extends pulumi.dynamic.Resource {
    dep: pulumi.Output<any>;
    constructor(name: string, props: ProvisionerProperties<T>, opts?: pulumi.CustomResourceOptions) {
        const provider = {
            diff: async (id: pulumi.ID, olds: State<T>, news: State<T>) => {
                const replace = JSON.stringify(olds.dep) !== JSON.stringify(news.dep);
                return {
                    changes: replace,
                    replaces: replace ? [ "dep" ] : undefined,
                    deleteBeforeReplace: true,
                };
            },
            create: async (inputs: State<T>) => {
                await props.onCreate(inputs.dep);
                return { id: uuid.v4(), outs: inputs };
            },
        };
        super(provider, name, props, opts);
    }
}

export interface ProvisionerProperties<T> {
    dep: pulumi.Input<T>;
    onCreate: (dep: pulumi.Unwrap<T>) => Promise<void>;
}

interface State<T> {
    dep: pulumi.Unwrap<T>;
}
