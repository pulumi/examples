// Copyright 2016-2020, Pulumi Corporation.  All rights reserved.

import { CommandResult, execCommand } from "./execute";

export class PulumiRunner {

    private stackName: string;
    private outputs: { [key: string]: string } = {};
    private pulumiProjDir: string;
    private config: string[];

    constructor(config: { [key: string]: string }, pulumiProjectDir: string) {
        this.config = this.createConfigArray(config);
        this.pulumiProjDir = pulumiProjectDir;

        const randomDigits = 6;
        const randomSuffix = (Math.random() * Math.pow(10, randomDigits)).toFixed(0);
        this.stackName = `integration.test.${randomSuffix}`;
    }

    public async setup(): Promise<RunnerResult> {
        try {
            const initResult = await this.stackInit();
            if (!initResult.success) {
                return Promise.resolve({ success: false, error: initResult.error });
            }

            const upResult = await this.up();
            if (!upResult.success) {
                return Promise.resolve({ success: false, error: upResult.error });
            }

            const outputResult = await this.stackOutputs();
            if (!outputResult.success) {
                return Promise.resolve({ success: false, error: outputResult.error });
            }
            return Promise.resolve({ success: true });
        } catch (e) {
            return Promise.resolve({ success: false, error: e });
        }
    }

    public async teardown(): Promise<RunnerResult> {
        try {
            const destroyResult = await this.destroy();
            if (!destroyResult.success) {
                return Promise.resolve({ success: false, error: destroyResult.error });
            }
            const rmResult = await this.stackRemove();
            if (!rmResult.success) {
                return Promise.resolve({ success: false, error: rmResult.error });
            }
            return Promise.resolve({ success: true });
        } catch (e) {
            return Promise.resolve({ success: false, error: e });
        }
    }

    public getStackOutput(key: string): string {
        return this.outputs[key];
    }

    public getStackOutputKeys(): string[] {
        return Object.keys(this.outputs);
    }

    public getStackName(): string {
        return this.stackName;
    }

    private async stackInit(): Promise<CommandResult> {
        return await execCommand("pulumi", ["stack", "init", this.stackName, "--cwd", this.pulumiProjDir]);
    }

    private async up(): Promise<CommandResult> {
        return await execCommand("pulumi", ["up", "--non-interactive", "--cwd", this.pulumiProjDir, ...this.config]);
    }

    private async stackOutputs(): Promise<CommandResult> {
        try {
            const result: string[] = [];
            const onStdOut = (output: string) => {
                result.push(output);
            };
            const outputResult = await execCommand("pulumi", ["stack", "output", "--cwd", this.pulumiProjDir, "--json"], undefined, onStdOut);
            if (!outputResult.success) { throw new Error("Failed to get stack outputs: ${outputResult.error}"); }

            const json = result.join();
            const parsedOutput = JSON.parse(json);
            for (const key of Object.keys(parsedOutput)) {
                this.outputs[key] = parsedOutput[key];
            }
            return Promise.resolve({ success: true });
        } catch (e) {
            return Promise.resolve({ success: false, error: e });
        }

    }

    private async destroy(): Promise<CommandResult> {
        return await execCommand("pulumi", ["destroy", "--non-interactive", "--cwd", this.pulumiProjDir]);
    }

    private async stackRemove(): Promise<CommandResult> {
        return await execCommand("pulumi", ["stack", "rm", this.stackName, "--cwd", this.pulumiProjDir, "--yes"]);
    }

    private createConfigArray(config: { [key: string]: string }): string[] {
        const result: string[] = [];
        for (const key of Object.keys(config)) {
            result.push("-c");
            result.push(`${key}=${config[key]}`);
        }

        return result;
    }
}

export interface RunnerResult {
    success: boolean;
    error?: string;
}
