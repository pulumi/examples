import * as pulumi from "@pulumi/pulumi";

export class Dummy extends pulumi.ComponentResource {
    public deadweight: pulumi.Output<string>;

    constructor(name: string, deadweight: pulumi.Input<string>, opts: pulumi.ComponentResourceOptions = {}) {
        super("examples:dummy:Dummy", name, {'deadweight': deadweight}, opts);

        this.deadweight = pulumi.Output.create(deadweight);
    }
}
