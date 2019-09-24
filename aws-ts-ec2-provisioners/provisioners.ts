// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";
import { Provisioner } from "./provisioner";

// ConnectionArgs tells a provisioner how to access a remote resource. For example, it may need to use
// SSH or WinRM to connect to the resource in order to run a command or copy a file.
export interface ConnectionArgs {
    type?: ConnectionType;
    host: pulumi.Input<string>;
    port?: pulumi.Input<number>;
    username?: pulumi.Input<string>;
    password?: pulumi.Input<string>;
    privateKey?: pulumi.Input<string>;
    privateKeyPassphrase?: pulumi.Input<string>;
}

// ConnectionType is the set of legal connection mechanisms to use. Default is SSH.
export type ConnectionType = "ssh" | "winrm";

function connTypeOrDefault(conn: pulumi.Unwrap<ConnectionArgs>): ConnectionType {
    return conn.type || "ssh";
}

function connPortOrDefault(conn: pulumi.Unwrap<ConnectionArgs>): number {
    if (conn.port !== undefined) {
        return conn.port;
    }

    const connType = connTypeOrDefault(conn);
    switch (connType) {
        case "ssh":
            return 22;
        case "winrm":
            return 5985;
        default:
            throw new Error(`unrecognized connectiont ype ${connType}`);
    }
}

function connUsernameOrDefault(conn: pulumi.Unwrap<ConnectionArgs>): string {
    if (conn.username) {
        return conn.username;
    }

    const connType = connTypeOrDefault(conn);
    switch (connType) {
        case "ssh":
            return "root";
        case "winrm":
            return "Administrator";
        default:
            throw new Error(`unrecognized connectiont ype ${connType}`);
    }
}

function connToSsh2(conn: pulumi.Unwrap<ConnectionArgs>): any {
    return {
        host: conn.host,
        port: conn.port,
        username: connUsernameOrDefault(conn),
        password: conn.password,
        privateKey: conn.privateKey,
        passphrase: conn.privateKeyPassphrase,
    };
}

function copyFile(conn: pulumi.Unwrap<ConnectionArgs>, src: string, dest: string): Promise<void> {
    const connType = connTypeOrDefault(conn);
    if (connType !== "ssh") {
        throw new Error("only SSH connection types currently supported");
    }

    const scp2 = require("scp2");
    let connectionFailCount = 0;
    return new Promise((resolve, reject) => {
        function scp() {
            scp2.scp(
                src,
                { path: dest, ...connToSsh2(conn) },
                (err) => {
                    if (err) {
                        connectionFailCount++;
                        if (connectionFailCount > 10) {
                            reject(err);
                        } else {
                            setTimeout(scp, connectionFailCount * 500);
                        }
                        return;
                    }
                    resolve();
                },
            );
        }
        scp();
    });
}

function runCommand(conn: pulumi.Unwrap<ConnectionArgs>, cmd: string): Promise<string> {
    const connType = connTypeOrDefault(conn);
    if (connType !== "ssh") {
        throw new Error("only SSH connection types currently supported");
    }

    const ssh2 = require("ssh2");
    const sshConn = connToSsh2(conn);
    let connectionFailCount = 0;
    return new Promise((resolve, reject) => {
        const conn = new ssh2.Client();
        function connect() {
            conn.on("ready", () => {
                conn.exec(cmd, (err, stream) => {
                    if (err) {
                        reject(err);
                        return;
                    }
                    stream.on("close", (code, signal) => {
                        conn.end();
                        if (code) {
                            reject(new Error("Command exited with " + code));
                        } else {
                            resolve();
                        }
                    }).on("data", (data) => {
                        console.log(data.toString("utf8"));
                    }).stderr.on("data", (data) => {
                        console.error(data.toString("utf8"));
                    });
                });
            }).on("error", (err) => {
                connectionFailCount++;
                if (connectionFailCount > 10) {
                    reject(err);
                } else {
                    setTimeout(connect, connectionFailCount * 500);
                }
            }).connect(sshConn);
        }
        connect();
    });
}


// CopyFile is a provisioner step that can copy a file from the machine running Pulumi to the newly created resource.
export class CopyFile extends pulumi.ComponentResource {
    private readonly provisioner: Provisioner<ConnectionArgs>;

    constructor(name: string, args: CopyFileArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pulumi:provisioners:CopyFile", name, args, opts);

        this.provisioner = new Provisioner<ConnectionArgs>(
            `${name}-provisioner`,
            {
                dep: args.conn,
                onCreate: (conn) => copyFile(conn, args.src, args.dest),
            },
            { parent: this, ...opts || {} },
        );
    }
}

export interface CopyFileArgs {
    // conn contains information on how to connect to the destination, in addition to dependency information.
    conn: pulumi.Input<ConnectionArgs>;
    // src is the source of the file or directory to copy. It can be specified as relative to the current
    // working directory or as an absolute path. This cannot be specified if content is set.
    src: string;
    // // content is the in-memory content to copy to the destination. If the destination is a file, the content
    // // will be written on that file, whereas if it's a directory, a file named `pulumi-content` is created.
    // content?: pulumi.Input<string>;
    // dest is required and specifies the absolute path on the target where the file will be copied to.
    dest: string;
}

// RemoteExec runs remote commands and/or invokes scripts. If commands and scripts are specified, they are
// run in the following order: command, commands, script, and finally then scripts.
export class RemoteExec extends pulumi.ComponentResource {
    private readonly provisioner: Provisioner<ConnectionArgs>;

    constructor(name: string, args: RemoteExecArgs, opts?: pulumi.ComponentResourceOptions) {
        super("pulumi:provisioners:RemoteExec", name, args, opts);

        this.provisioner = new Provisioner<ConnectionArgs>(
            `${name}-provisioner`,
            {
                dep: args.conn,
                onCreate: async (conn) => {
                    if (args.command) {
                        await runCommand(conn, args.command);
                    }
                    if (args.commands) {
                        for (const cmd of args.commands) {
                            await runCommand(conn, cmd);
                        }
                    }
                },
            },
            { parent: this, ...opts || {} },
        );
    }
}

export interface RemoteExecArgs {
    conn: ConnectionArgs;
    command?: string;
    commands?: string[];
}

