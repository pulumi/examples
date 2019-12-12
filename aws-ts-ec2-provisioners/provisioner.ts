// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as uuid from "uuid";

// Provisioner lets a custom action run the first time a resource has been created. It takes as input
// a dependent property. Anytime its value changes, the resource is replaced and will re-run its logic.
export class Provisioner<T, U> extends pulumi.dynamic.Resource {
    dep: pulumi.Output<T>;
    result: pulumi.Output<U>;
    constructor(name: string, props: ProvisionerProperties<T, U>, opts?: pulumi.CustomResourceOptions) {
        const provider: pulumi.dynamic.ResourceProvider = {
            diff: async (id: pulumi.ID, olds: State<T, U>, news: State<T, U>) => {
                const replace = JSON.stringify(olds.dep) !== JSON.stringify(news.dep);
                return {
                    changes: replace,
                    replaces: replace ? ["dep"] : undefined,
                    deleteBeforeReplace: true,
                };
            },
            create: async (inputs: State<T, U>) => {
                const result = await props.onCreate(inputs.dep);
                if (result !== undefined) {
                    inputs.result = result;
                }
                return { id: uuid.v4(), outs: inputs };
            },
        };
        super(provider, name, { dep: props.dep, result: null }, opts);
    }
}

export interface ProvisionerProperties<T, U> {
    dep: pulumi.Input<T>;
    onCreate: (dep: pulumi.Unwrap<T>) => Promise<pulumi.Unwrap<U>>;
}

interface State<T, U> {
    dep: pulumi.Unwrap<T>;
    result: pulumi.Unwrap<U>;
}
