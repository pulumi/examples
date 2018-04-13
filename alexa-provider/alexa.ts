// Copyright 2016-2017, Pulumi Corporation.  All rights reserved.

import * as pulumi from "pulumi";
import * as dynamic from "pulumi/dynamic";
import * as aws from "@pulumi/aws";
import * as fs from "fs";
import * as child_process from "child_process";
import * as sleep from "sleep";
import * as tmp from "tmp";

class SkillProvider implements dynamic.ResourceProvider {
	constructor() {
	}

	makeManifest = (inputs: any) => {
		return {
			skillManifest: {
				publishingInformation: {
					locales: {
						"en-US": {
							name: inputs.name,
							summary: inputs.summary,
							description: inputs.description,
						},
					},
					isAvailableWorldwide: true,
					distributionCountries: [],
				},
				apis: {
					custom: {
						endpoint: {
							uri: inputs.lambda,
						},
					},
				},
				manifestVersion: "1.0",
			},
		};
	};

	makeInteractionModel = (inputs: any) => {
		return {
			interactionModel: {
				languageModel: {
					invocationName: inputs.invocationName,
					intents: inputs.intents,
				},
			},
		};
	};

	updateModel = (id: string, inputs: any) => {
		// Write the interaction model to a temporary file and update it.
		const modelFile = tmp.fileSync();
		fs.writeFileSync(modelFile.fd, JSON.stringify(this.makeInteractionModel(inputs)));
		child_process.execSync(`ask api update-model -s ${id} -l en-US -f ${modelFile.name}`);

		while (true) {
			const modelStatus = child_process.execSync(`ask api get-model-status -s ${id} -l en-US`);
			const inProgress = /Model build status: IN_PROGRESS/.test(modelStatus.toString());
			if (!inProgress) {
				return;
			}
			sleep.sleep(5);
		}
	};

	check = (olds: any, news: any) => Promise.resolve({inputs: news});
	diff = (id: pulumi.ID, olds: any, news: any) => Promise.resolve({});

	create = (inputs: any) => {
		// Write the skill manifest to a temporary file and create the skill.
		const manifestFile = tmp.fileSync();
		fs.writeFileSync(manifestFile.fd, JSON.stringify(this.makeManifest(inputs)));
		const createStdout = child_process.execSync(`ask api create-skill -f ${manifestFile.name}`);
		const skillId = /Skill ID: ([a-zA-Z0-9.-]+)/.exec(createStdout.toString())[1];

		// Create the interaction model.
		this.updateModel(skillId, inputs);

		return Promise.resolve({id: skillId});
	}

	update = (id: string, olds: any, news: any) => {
		// Write the skill manifest to a temporary file and update the skill.
		const manifestFile = tmp.fileSync();
		fs.writeFileSync(manifestFile.fd, JSON.stringify(this.makeManifest(news)));
		const updateStdout = child_process.execSync(`ask api update-skill -s ${id} -f ${manifestFile.name}`);

		// Create the interaction model.
		this.updateModel(id, news);
		// Write the interaction model to a temporary file and update it.

		return Promise.resolve({outs: {}});
	}

	delete = (id: pulumi.ID, props: any) => {
		child_process.execSync(`ask api delete-skill -s ${id}`);
		return Promise.resolve();
	}
}

export interface SkillArgs {
	readonly description?: pulumi.ComputedValue<string>;
	readonly summary?: pulumi.ComputedValue<string>;
	readonly lambda: aws.lambda.Function;
	readonly invocationName: pulumi.ComputedValue<string>;
	readonly intents: pulumi.ComputedValue<{name: pulumi.ComputedValue<string>, samples: pulumi.ComputedValue<string>[]}>[];
}

export class Skill extends dynamic.Resource {
	private static provider = new SkillProvider();

	constructor(name: string, args: SkillArgs) {
		super(Skill.provider, name, {
			name: name,
			description: args.description,
			summary: args.summary,
			lambda: args.lambda.arn,
			invocationName: args.invocationName,
			intents: args.intents,
		}, undefined);
	}
}
