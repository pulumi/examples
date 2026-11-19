// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

using System.Collections.Generic;
using System.Collections.Immutable;
using System.Linq;
using Pulumi;
using Pulumi.Delivery;
using Pulumi.Delivery.Inputs;

return await Deployment.RunAsync(() =>
{
    // Pulumi.Config, not the Delivery SDK's own Config class.
    var config = new Pulumi.Config();
    var repository = config.Require("repository");
    var branch = config.Require("branch");
    var path = config.Require("path");

    var org = Deployment.Instance.OrganizationName;

    // Run the pipeline on every push that touches this example.
    var code = new GitHubSource("code", new GitHubSourceArgs
    {
        Repository = repository,
        Branch = branch,
        Trigger = new SourceTriggerArgs { Paths = { $"{path}/**" } },
    });

    // Where Delivery reads this program from is set by `delivery:source` in
    // the pipeline stack's config. A push there updates the pipeline.
    var pipeline = new Pipeline("pipeline");

    // Build stage: create the registry, build the image and push it, tagged
    // with the commit.
    var build = new Stage("build", new StageArgs { Pipeline = pipeline });
    var imageStacks = new Stacks("build", new StacksArgs
    {
        Stage = build,
        Stacks =
        {
            ["image"] = new StacksEntryArgs
            {
                Stack = $"{org}/azure-cs-delivery-container-apps-image/image",
                Source = code,
                Directory = $"{path}/image",
                Config = { ["commit"] = code.Commit },
            },
        },
    });

    // Beta stage: deploy the image the build stage pushed, by digest, to a
    // Container App.
    var beta = new Stage("beta", new StageArgs { Pipeline = pipeline, From = { build } });
    var betaStacks = new Stacks("beta", new StacksArgs
    {
        Stage = beta,
        Stacks =
        {
            ["beta"] = new StacksEntryArgs
            {
                Stack = $"{org}/azure-cs-delivery-container-apps-beta/beta",
                Source = code,
                Directory = $"{path}/beta",
                Config = imageStacks.Outputs.Apply(outputs =>
                    Pick(outputs, "image", "imageRef", "registryName", "resourceGroupName")),
            },
        },
    });

    new Job("check-url", new JobArgs
    {
        Stage = beta,
        Source = code,
        Directory = $"{path}/pipeline",
        Command = "./check-url.sh",
        Environment = betaStacks.Outputs.Apply(outputs =>
            Pick(outputs, "beta", "url").ToImmutableDictionary(_ => "SERVICE_URL", kv => kv.Value)),
    }, new ComponentResourceOptions { DependsOn = { betaStacks } });

    new Artifact("beta-url", new ArtifactArgs
    {
        Stage = beta,
        Value = betaStacks.Outputs.Apply(outputs => Pick(outputs, "beta", "url").GetValueOrDefault("url")),
    });
});

// Stack outputs are empty until a stack has run once, and unknown during a
// preview. Pass on only the values that exist.
static ImmutableDictionary<string, string> Pick(
    ImmutableDictionary<string, ImmutableDictionary<string, object>>? outputs,
    string entry,
    params string[] keys) =>
    (outputs?.GetValueOrDefault(entry) ?? ImmutableDictionary<string, object>.Empty)
        .Where(kv => keys.Contains(kv.Key) && kv.Value is string { Length: > 0 })
        .ToImmutableDictionary(kv => kv.Key, kv => (string)kv.Value);
