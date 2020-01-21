// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import { spawn } from "child_process";

export interface CommandResult {
    success: boolean;
    error?: string;
}

export const execCommand = async (cmd: string, args: string[], onStdErr?: (msg: string) => void, onStdOut?: (msg: string) => void) => {
    console.log(`Executing command: ${cmd} ${args.join(" ")}`);
    const proc = spawn(cmd, args);

    proc.stdout.setEncoding("utf8");
    proc.stderr.setEncoding("utf8");

    const procFuture = new Promise<CommandResult>((resolve) => {
        const err: string[] = [];

        proc.stderr.on("data", (chunk) => {
            console.error(chunk);
            if (onStdErr) { onStdErr(chunk.toString()); }
            err.push(chunk.toString());
        });

        proc.stdout.on("data", (chunk) => {
            console.log(chunk);
            if (onStdOut) { onStdOut(chunk.toString()); }
        });

        proc.on("close", (code) => {
            if (code === 0) {
                resolve({ success: true });
            }
            else {
                resolve({ success: true, error: err.join("\n") });
            }
        });
    });

    return await procFuture;
};
