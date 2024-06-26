import { PolicyPack, PolicyResource, ReportViolation, StackValidationArgs } from "@pulumi/policy";
const awaitSpawn = require("await-spawn");
const fs = require("fs");

interface SnykPolicyConfig {
    dockerfileScanning: boolean,
    excludeBaseImageVulns: boolean,
    failOn: string,
    pulumiProgramAbsPath: string,
    severityThreshold: string,
}

const validateStack = async (args: StackValidationArgs, reportViolation: ReportViolation) => {
    const config = args.getConfig<SnykPolicyConfig>();

    if (config.dockerfileScanning && !config.pulumiProgramAbsPath) {
        throw new Error("If `dockerfileScanning` is configured to be `true`, `pulumiProgramAbsPath` must be set to the absolute path of the Pulumi program this policy is evaluating.");
    }

    const dockerImages = args.resources.filter(x => x.type === "docker:index/image:Image");
    for (const image of dockerImages) {
        await validateStackImage(config, image, reportViolation);
    }
};

const validateStackImage = async (config: SnykPolicyConfig, image: PolicyResource, reportViolation: ReportViolation) => {
    const commandArgs = [
        "container",
        "test",
        image.props["imageName"],
    ];

    if (config.dockerfileScanning) {
        const dockerfileAbsPath = `${config.pulumiProgramAbsPath}/${image.props.dockerfile}`;

        if (!fs.existsSync(dockerfileAbsPath)) {
            const msg = `dockerfileScanning is set to 'true', but the Dockerfile at path '${dockerfileAbsPath}' could not be found. Either reconfigure the policy to turn off Dockerfile scanning, or set the value of docker.Image.snyk.dockerfileAbsPath resource to the absolute path of the Dockerfile in a resource transform.`;
            reportViolation(msg);
            return;
        }

        commandArgs.push(`--file=${dockerfileAbsPath}`);
    }

    if (config.excludeBaseImageVulns) {
        commandArgs.push("--exclude-base-image-vulns");
    }

    commandArgs.push(`--severity-threshold=${config.severityThreshold}`);

    try {
        await awaitSpawn("snyk", commandArgs);
    } catch (e) {
        let errorMessage = `Snyk validation failed.`;

        if (e.stdout && e.stdout.toString()) {
            errorMessage += `\n${e.stdout.toString()}`;
        }

        if (e.stderr && e.stderr.toString()) {
            errorMessage += `\n${e.stderr.toString()}`;
        }

        reportViolation(errorMessage);
    }
};

new PolicyPack("snyk-container-scanning", {
    policies: [{
        name: "snyk-container-scan",
        configSchema: {
            properties: {
                "dockerfileScanning": {
                    default: true,
                    type: "boolean",
                },
                "excludeBaseImageVulns": {
                    default: false,
                    type: "boolean"
                },
                "failOn": {
                    default: "all",
                    enum: ["all", "upgradable"]
                },
                "pulumiProgramAbsPath": {
                    type: "string"
                },
                "severityThreshold": {
                    default: "critical",
                    enum: ["low", "medium", "high", "critical"]
                },
            },
        },
        enforcementLevel: "mandatory",
        description: "Scans Docker Images with Snyk",
        validateStack: validateStack,
    }],
});