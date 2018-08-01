import * as fs from "async-file";
import * as mustache from "mustache";

// Init supports CloudFormation cfn-init-like structures for expressing post-provisioning virtual machine
// initialization steps, including installing packages and files, running commands, and managing services.
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

// createUserData produces a cloud-init payload, suitable for user data, out of the given init structure.
export async function createUserData(configs: string[], init: Init): Promise<string> {
    // We need to encode the user data into multiple MIME parts. This ensures that all of the pieces are processed
    // correctly by the cloud-init system, without needing to do map merging, etc.
    const boundary = "cd4621d39f783ba4";
    let result = `Content-Type: multipart/mixed; ` +
                    `Merge-Type: list(append)+dict(recurse_array)+str(); ` +
                    `boundary="${boundary}"\n` +
                 `MIME-Version: 1.0\r\n\r\n`;

    // For each config entry, generate the cloud-init statements to carry out its wishes.
    for (let name of configs) {
        let config = init[name];
        if (!config) {
            throw new Error(`Missing config entry for ${name}`);
        }

        result += `--${boundary}\nContent-Type: text/cloud-config\r\n\r\n`;
        result += `merge_how: list(append)+dict(recurse_array)+str()\n`;

        // Process the sections in the same order as cfn-init; from:
        // https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-init.html:
        //
        //     "The cfn-init helper script processes these configuration sections in the following order: packages,
        //      groups, users, sources, files, commands, and then services. If you require a different order, separate
        //      your sections into different config keys, and then use a configset that specifies the order in which the
        //      config keys should be processed."
        //
        // TODO: support for groups, users, and sources.

        if (config.packages && Object.keys(config.packages).length) {
            // Install package manager packages:
            result += `update_packages: true\n`;
            result += `packages:\n`;
            for (let manager of Object.keys(config.packages)) {
                let packages = config.packages[manager];
                switch (manager) {
                    case "yum":
                        for (let pkg of packages) {
                            result += `- ${pkg}\n`;
                        }
                        break;
                    default:
                        // TODO: support more package managers.
                        throw new Error(`Unrecognized package manager: ${manager}`);
                }
            }
        }

        if (config.files && Object.keys(config.files).length) {
            // Emit files with the appropriate content and permissions:
            result += `write_files:\n`;
            for (let path of Object.keys(config.files)) {
                let file = config.files[path];
                result += `- path: ${path}\n`;
                result += `  encoding: b64\n`;
                result += `  content: ${Buffer.from(await file.content).toString("base64")}\n`;
                result += `  owner: ${file.owner}:${file.group}\n`;
                result += `  permissions: '${file.mode}'\n`;
            }
        }

        let commands = config.commands || {};

        if (config.services && Object.keys(config.services).length) {
            for (let manager of Object.keys(config.services)) {
                // Expand out service management into commands, as there is no built-in cloud-init equivalent:
                let services = config.services[manager];
                switch (manager) {
                    case "sysvinit":
                        for (let service of Object.keys(services)) {
                            let serviceInfo = services[service];
                            if (serviceInfo.enabled) {
                                commands[`${manager}-${service}-enabled`] = {
                                    command: `chkconfig ${service} on`,
                                };
                            }
                            if (serviceInfo.ensureRunning) {
                                commands[`${manager}-${service}-ensureRunning`] = {
                                    command: `service ${service} start`,
                                };
                            }
                        }
                        break;
                    default:
                        // TODO: support more service managers.
                        throw new Error(`Unrecognized service manager: ${manager}`);
                }
            }
        }

        if (commands && Object.keys(commands).length) {
            // Invoke commands as they are encountered:
            result += `runcmd:\n`;
            for (let command of Object.keys(commands)) {
                let entry = commands[command];
                result += `- ${entry.command}\n`;
                if (entry.test) {
                    result += `- ${entry.test}\n`;
                }
            }
        }
    }

    result += `--${boundary}--`;

    return result;
}

export async function renderConfigFile(path: string, config: any): Promise<string> {
    return mustache.render(await fs.readFile(path, "utf8"), config);
}
