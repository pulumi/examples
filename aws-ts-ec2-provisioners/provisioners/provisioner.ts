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
                let replace = false;
                let replacementProperties = [];
                if (JSON.stringify(olds.dep) !== JSON.stringify(news.dep)) {
                    replace = true;
                    replacementProperties.push("dep");
                }
                // Only trigger replacement due to the `changeToken` property, IFF
                // the changeToken still has a value in the new inputs, and it doesn't
                // match with the old value. If, say, the user decides to no longer specify
                // the changeToken in the new inputs, then we don't trigger a replacement.
                if (news.changeToken && olds.changeToken !== news.changeToken) {
                    replace = true;
                    replacementProperties.push("changeToken");
                }
                return {
                    changes: replace,
                    replaces: replace ? replacementProperties : undefined,
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
        super(provider, name, { dep: props.dep, changeToken: props.changeToken, result: null }, opts);
    }
}

export interface ProvisionerProperties<T, U> {
    dep: pulumi.Input<T>;
    changeToken: pulumi.Input<string>;
    onCreate: (dep: pulumi.Unwrap<T>) => Promise<pulumi.Unwrap<U>>;
}

interface State<T, U> {
    dep: pulumi.Unwrap<T>;
    changeToken: pulumi.Unwrap<string>;
    result: pulumi.Unwrap<U>;
}
