import * as automation from "@pulumi/pulumi/automation";
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as path from "path";
import * as marked from "marked";

import nodeFetch from "node-fetch";
import tree from "directory-tree";

import { exec } from "child_process";

interface Example {
    id: string;
    title: string;
    description: string;
    readme: string;
    url?: string;
    program: {
        name: string;
        settings: automation.ProjectSettings;
        tree: object;
    }
    stack: {
        name: string;
        config: automation.ConfigMap;
    };
    lastUpdate: {
        result: automation.UpResult;
        resources: any[];
    };
    tags: string[];
    contributors: string[],

    workDir: string;
}

interface SerializableExample {
    id: string;
    title: string;
    description: string;
    readme: string;
    url?: string;
    program: {
        name: string;
        settings: {
            name: string;
            runtime: string;
            description: string;
        };
    }
    stack: {
        name: string;
        config: {
            [key: string]: any;
        };
    };
    lastUpdate: {
        result: {
            summary: {
                result: "succeeded" | "failed";
                resourceChanges: {
                    create: number;
                };
            };
            startTime: number;
            endTime: number;
            config: {
                [key: string]: any;
            };
            outputs: {
                [key: string]: any;
            };
            stdout: string;
            stderr: string;
        };
        resources: {
            urn: string;
            type: string;
        }[];
    };
    tags: string[];
    contributors: string[],
}

interface ExampleRunResult {
    id: number;
    exampleID: string;
    succeeded: boolean;
    stdout?: string;
    stderr?: string;
}

function serializeExample(example: Example): SerializableExample {
    return {
        id: example.id,
        title: example.title,
        description: example.description,
        readme: example.readme,
        url: example.url,
        program: {
            name: example.program.name,
            settings: {
                name: example.program.settings.name,
                description: example.program.settings.description || "",
                runtime: typeof example.program.settings.runtime === "object"
                    ? example.program.settings.runtime.name
                    : example.program.settings.runtime,
            }
        },
        stack: {
            name: example.stack.name,
            config: JSON.parse(JSON.stringify(example.stack.config)),
        },
        lastUpdate: {
            result: {
                summary: {
                    result: example.lastUpdate.result.summary.result === "succeeded" ? "succeeded" : "failed",
                    resourceChanges: {
                        create: example.lastUpdate.result.summary.resourceChanges?.create ? example.lastUpdate.result.summary.resourceChanges.create : 0,
                    }
                },
                startTime: new Date(example.lastUpdate.result.summary.startTime).getTime(),
                endTime: new Date(example.lastUpdate.result.summary.endTime).getTime(),
                config: JSON.parse(JSON.stringify(example.lastUpdate.result.summary.config)),
                outputs: JSON.parse(JSON.stringify(example.lastUpdate.result.outputs)),
                stdout: example.lastUpdate.result.stdout,
                stderr: example.lastUpdate.result.stderr,
            },
            resources: example.lastUpdate.resources,
        },
        tags: [],
        contributors: [],
    };
}

function install(runtime: automation.ProjectRuntime | automation.ProjectRuntimeInfo): string | undefined {
    let runtimeName = typeof runtime === "object" ? runtime.name : runtime;

    switch (runtimeName) {
        case "nodejs":
            return "echo 'Installing nodejs dependencies...' && yarn";
        case "python":
            return "echo 'Runtime was 'python', which is handled automatically. Skipping install step.";
        case "go":
            return "echo 'Installing Go dependencies...' && go mod download && go mod tidy";
        case "dotnet":
            return "echo 'Runtime was 'dotnet', which is handled automatically. Skipping install step.";
        case "yaml":
            return "echo 'Runtime was 'yaml'. Skipping install step.";
    }
}

async function run(): Promise<ExampleRunResult> {
    const workDir = await getProgramPath();
    console.log(`Got program: ${workDir}`);

    const stackName = "some-stack";
    console.log({ stackName, workDir });

    const stack = await automation.LocalWorkspace.createOrSelectStack({
        stackName,
        workDir,
    });

    const config = await stack.getAllConfig();
    const settings = await stack.workspace.projectSettings();

    // This isn't great as a "unique" identifier, but it's fine for now. Should probably
    // use URL or just something straight-up unique that maps to URL, or something.
    const exampleID = settings.name;
    const runID = Date.now();

    await new Promise(async (resolve, reject) => {
        const command = install(settings.runtime);
        if (!command) {
            reject();
            return;
        }

        console.log(`Running '${command}'...`)
        exec(command, { cwd: workDir }, resolve);
    });

    try {
        const destroy = await stack.destroy({
            onOutput: (out => console.log(out)),
        });

        const up = await stack.up({
            onOutput: (out => console.log(out)),
        });

        let name: string = "", description: string = "";

        marked.marked.use({
            walkTokens: (token) => {
                if (!name && token.type === "heading" && token.depth === 1) {
                    name = token.text;
                }

                if (!description && token.type === "paragraph") {
                    description = token.text;
                }
            },
        });

        const parsed = marked.marked.parse(fs.readFileSync(`${workDir}/README.md`, "utf-8"));
        const files = tree(workDir, { exclude: /node_modules/ });

        const exported = await stack.exportStack();
        await stack.destroy();
        await stack.workspace.removeStack(stack.name);

        const example = {
            id: exampleID,
            title: name,
            description,
            url: "",
            readme: parsed,
            program: {
                name: settings.name,
                settings,
                tree: files,
            },
            stack: {
                name: stack.name,
                config,
            },
            lastUpdate: {
                result: up,
                resources: exported.deployment.resources.map((r: any) => {
                    return {
                        urn: r.urn,
                        type: r.type,
                    };
                }),
            },
            tags: [],
            contributors: [],
            workDir,
        };

        const result: ExampleRunResult = {
            id: runID, exampleID,
            succeeded: true,
            stdout: up.stdout,
            stderr: up.stderr
        };

        await writeExample(example)

        return result;

    } catch (error) {

        console.error(error);

        console.error("Destroying stack...");
        await stack.destroy();

        console.error("Removing workspace...");
        await stack.workspace.removeStack(stack.name);

        const result: ExampleRunResult = {
            id: runID,
            exampleID,
            succeeded: false,
            stdout: "",
            stderr: error as string,
        };

        return result;
    }
}

async function getProgramPath(): Promise<string> {
    const programPath = process.argv[2];
    return path.join("..", "..", programPath);
}

async function writeExample(example: Example) {
    const serializableExample = serializeExample(example);

    const infraStackResponse = await nodeFetch(`${process.env.PULUMI_API}/api/stacks/${process.env.EXAMPLES_API_STACK}/export`, {
        headers: {
            "Authorization": `token ${process.env.PULUMI_ACCESS_TOKEN}`,
        },
    });

    const stackState = await infraStackResponse.json();
    const stackResources: any[] = stackState.deployment.resources;
    const apiURL = stackResources.filter(resource => resource.type === "pulumi:pulumi:Stack")[0].outputs.apiURL

    const response = await nodeFetch(`${apiURL}/examples/${example.id}`, {
        method: "PUT",
        body: JSON.stringify({ example: serializableExample }),
        headers: {
            "Content-Type": "application/json",
            "x-api-key": `${process.env.EXAMPLES_API_KEY}`,
        },
    });

    console.log(JSON.stringify(response, null, 4));
}

run()
    .then(result => {
        console.log(`Run of ${result.exampleID} ${result.succeeded ? "succeeded" : "failed"}. See /jobs/${result.id} for details.`);
    })
    .catch(error => {
        throw new Error(error);
    })
    .finally(()=> {
        console.log("Done. ✨");
    });
