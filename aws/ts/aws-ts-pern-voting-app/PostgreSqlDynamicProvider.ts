// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import * as crypto from "crypto";

// A class representing the arguments that the dynamic provider needs. Each argument
// will automatically be converted from Input[T] to T before being passed to the
// functions in the provider
export interface SchemaInputs {
    creatorName: pulumi.Input<string>;
    creatorPassword: pulumi.Input<string>;
    serverAddress: pulumi.Input<string>;
    databaseName: pulumi.Input<string>;
    creationScript: pulumi.Input<string>;
    deletionScript: pulumi.Input<string>;
    postgresUserName: pulumi.Input<string>;
}

// The code for the dynamic provider that gives us our custom resource. It handles
// all the create, read, update, and delete operations the resource needs.
export class SchemaProvider implements pulumi.dynamic.ResourceProvider {
    // The function that is called when a new resource needs to be created
    async create(args: SchemaInputs): Promise<pulumi.dynamic.CreateResult> {
        const { Pool } = require("pg");
        const pool = new Pool({
            user: args.creatorName,
            password: args.creatorPassword,
            host: args.serverAddress,
            port: 2000,
            database: args.databaseName,
        });
        const scriptExecuted = await pool.query(args.creationScript);

        // Closing the connection to the postgresql database
        await pool.end();
        return {id: "postgresqlSchema-" + crypto.randomBytes(16).toString("hex"), outs: args};
    }

    // The function that is called when an existing resource needs to be deleted
    async delete(id: string, args: SchemaInputs): Promise<void> {
        const { Pool } = require("pg");
        const pool = new Pool({
            user: args.creatorName,
            password: args.creatorPassword,
            host: args.serverAddress,
            port: 2000,
            database: args.databaseName,
        });
        const scriptExecuted = await pool.query(args.deletionScript);

        // Closing the connection to the postgresql database
        await pool.end();
    }

    // The function that determines if an existing resource whose inputs were
    // modified needs to be updated or entirely replaced
    async diff(id: string, oldArgs: SchemaInputs, newArgs: SchemaInputs): Promise<pulumi.dynamic.DiffResult> {
        const changes: boolean = ((oldArgs.creatorName !== newArgs.creatorName) ||
            (oldArgs.creatorPassword !== newArgs.creatorPassword) || (oldArgs.serverAddress !== newArgs.serverAddress) ||
            (oldArgs.databaseName !== newArgs.databaseName) || (oldArgs.creationScript !== newArgs.creationScript) ||
            (oldArgs.deletionScript !== newArgs.deletionScript));

        const replaces: string[] = [];
        if (oldArgs.serverAddress !== newArgs.serverAddress) { replaces.push("serverAddress"); }
        if (oldArgs.databaseName !== newArgs.databaseName) { replaces.push("databaseName"); }
        if (oldArgs.creationScript !== newArgs.creationScript) { replaces.push("creationScript"); }

        return {
            // If the old and new inputs don't match, the resource needs to be updated/replaced
            changes: changes,
            // If the replaces[] list is empty, nothing important was changed, and we do not have to
            // replace the resource
            replaces: replaces,
            // An optional list of inputs that are always constant
            stables: [],
            // The existing resource is deleted before the new one is created
            deleteBeforeReplace: true,
        };
    }

    // The function that updates an existing resource without deleting and
    // recreating it from scratch
    async update(id: string, oldArgs: SchemaInputs, newArgs: SchemaInputs): Promise<pulumi.dynamic.UpdateResult> {
        // The old existing inputs are discarded and the new inputs are used
        return { outs: newArgs };
    }
}

// The main Schema resource that we instantiate in our infrastructure code
export class Schema extends pulumi.dynamic.Resource {
    // The inputs used by the dynamic provider are made implicitly availible as outputs
    public readonly creatorName!: pulumi.Output<string>;
    public readonly creatorPassword!: pulumi.Output<string>;
    public readonly serverAddress!: pulumi.Output<string>;
    public readonly databaseName!: pulumi.Output<string>;
    public readonly creationScript!: pulumi.Output<string>;
    public readonly deletionScript!: pulumi.Output<string>;
    constructor(name: string, args: SchemaInputs) {
        super(new SchemaProvider, name, args);
    }
}
