import * as fs from "async-file";
import * as mustache from "mustache";

type Init = {[config: string]: InitConfig};

interface InitConfig {
    files?: {[path: string]: InitFile};
    packages?: {[manager: string]: InitPackages};
    commands?: {[command: string]: InitCommand};
    services?: {[manager: string]: InitServices};
}

interface InitFile {
    content: Promise<string>;
    mode: string;
    owner: string;
    group: string;
}

// TODO: support full syntax for packages.
type InitPackages = string[];

interface InitCommand {
    command: string;
    test?: string;
}

type InitServices = {[service: string]: InitService};

interface InitService {
    enabled?: boolean;
    ensureRunning?: boolean;
}

// createUserData produces a single user data script out of the given init structure.
export async function createUserData(configs: string[], init: Init): Promise<string> {
    let script = `#!/bin/bash -xe\n\n`;

    // For each config entry, generate bash script that carries out its wishes.
    for (let name of configs) {
        let config = init[name];
        if (!config) {
            throw new Error(`Missing config entry for ${name}`);
        }

        script += `# ${name}:\n`;
        if (config.files) {
            // Emit files with the appropriate content and permissions:
            for (let path of Object.keys(config.files)) {
                let file = config.files[path];
                script += `echo "${await file.content}" > ${path}\n`;
                script += `chown ${file.owner}:${file.group} ${path}\n`;
                script += `chmod ${file.mode} ${path}\n`;
            }
        }
        if (config.packages) {
            // Install package manager packages:
            for (let manager of Object.keys(config.packages)) {
                let packages = config.packages[manager];
                switch (manager) {
                    case "yum":
                        script += `yum update -y\n`; // TODO: do this earlier.
                        script += `yum install -y ${packages.join(" ")}\n`;
                        break;
                    default:
                        // TODO: support more package managers.
                        throw new Error(`Unrecognized package manager: ${manager}`);
                }
            }
        }
        if (config.commands) {
            // Invoke commands as they are encountered:
            for (let command of Object.keys(config.commands)) {
                let entry = config.commands[command];
                script += `${entry.command}\n`;
                if (entry.test) {
                    script += `${entry.test}\n`;
                }
            }
        }
        if (config.services) {
            // Ensure services are managed appropriately:
            for (let manager of Object.keys(config.services)) {
                let services = config.services[manager];
                switch (manager) {
                    case "sysvinit":
                        for (let service of Object.keys(services)) {
                            let serviceInfo = services[service];
                            if (serviceInfo.enabled) {
                                script += `systemctl enable ${service}\n`;
                            }
                            if (serviceInfo.ensureRunning) {
                                script += `systemctl start ${service}\n`;
                            }
                        }
                        break;
                    default:
                        // TODO: support more service managers.
                        throw new Error(`Unrecognized service manager: ${manager}`);
                }
            }
        }

        script += `\n`;
    }

    return script;
}

export async function renderConfigFile(path: string, config: any): Promise<string> {
    return mustache.render(await fs.readFile(path, "utf8"), config);
}
