import * as pulumi from "@pulumi/pulumi";
import * as uuid from "uuid";

// BUGBUG(joe): when versioning the provisioner, due to the fact that __provider will change, we will
//     re-execute commands against the target VM (it will create a replacement). This is incorrect.

// Provisioner lets a custom action run the first time a resource has been created. It takes as input
// a dependent property. Anytime its value changes, the resource is replaced and will re-run its logic.
export class Provisioner<T> extends pulumi.dynamic.Resource {
    constructor(name: string, props: ProvisionerProperties<T>, opts?: pulumi.CustomResourceOptions) {
        const provider = {
            check: async (state: any, inputs: any) => inputs,
            diff: async (id: pulumi.ID, olds: any, news: any) => {
                // Check to see if the dependent property has changed in value. If a custom differ has been
                // supplied, use that, otherwise just rely on JavaScript triple-equality checking.
                let replace: boolean;
                if (props.equals) {
                    replace = !(await props.equals(olds.dep as pulumi.Unwrap<T>, news.dep as pulumi.Unwrap<T>));
                } else {
                    replace = olds.dep !== news.dep;
                }
                return {
                    changes: replace,
                    replaces: replace ? [ "dep" ] : undefined,
                    deleteBeforeReplace: true,
                };
            },
            create: async (inputs: any) => {
                // Await the dependencies. They should have been resolved by now.
                const dep = (await (<any>pulumi.Output.create(inputs.dep)).promise()) as pulumi.Unwrap<T>;

                // Pass those to the callback.
                await props.onCreate(dep);

                // Now return a UUID as the unique ID for the resulting provisioner.
                return { id: uuid.v4() };
            },
        };
        super(provider, name, props, opts);
    }
}

export interface ProvisionerProperties<T> {
    dep: pulumi.Input<T>;
    equals?: (olddep: pulumi.Unwrap<T>, newdep: pulumi.Unwrap<T>) => Promise<boolean>;
    onCreate: (dep: pulumi.Unwrap<T>) => Promise<void>;
}
