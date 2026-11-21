// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

package pipeline;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.delivery.GitHubSource;
import com.pulumi.delivery.GitHubSourceArgs;
import com.pulumi.delivery.Job;
import com.pulumi.delivery.JobArgs;
import com.pulumi.delivery.Pipeline;
import com.pulumi.delivery.Stacks;
import com.pulumi.delivery.StacksArgs;
import com.pulumi.delivery.Stage;
import com.pulumi.delivery.StageArgs;
import com.pulumi.delivery.inputs.SourceTriggerArgs;
import com.pulumi.delivery.inputs.StacksEntryArgs;
import com.pulumi.resources.ComponentResourceOptions;
import java.util.Map;
import java.util.Optional;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        var config = ctx.config();
        var repository = config.require("repository");
        var branch = config.require("branch");
        var path = config.require("path");
        var org = ctx.organizationName();

        // Run the pipeline on every push that touches this example.
        var code = new GitHubSource("code", GitHubSourceArgs.builder()
            .repository(repository)
            .branch(branch)
            .trigger(SourceTriggerArgs.builder().paths(path + "/**").build())
            .build());

        // Where Delivery reads this program from is set by `delivery:source`
        // in the pipeline stack's config. A push there updates the pipeline.
        var pipeline = new Pipeline("pipeline");

        // Build stage: create the registry, build the image on Depot and push
        // it, tagged with the commit.
        var build = new Stage("build", StageArgs.builder().pipeline(pipeline).build());
        var imageStacks = new Stacks("build", StacksArgs.builder()
            .stage(build)
            .stacks(Map.of("image", StacksEntryArgs.builder()
                .stack(org + "/gcp-java-delivery-gke-depot-image/image")
                .source(code)
                .directory(path + "/image")
                // The source has no commit until its first run, as on a first registration.
                .config(code.commit().applyValue(commit -> Optional.ofNullable(commit)
                    .map(c -> Map.of("commit", c))
                    .orElse(Map.of())))
                .build()))
            .build());

        // Beta stage: deploy the exact image the build stage pushed, by
        // digest, to GKE, then check that the service answers.
        var beta = new Stage("beta", StageArgs.builder().pipeline(pipeline).from(build).build());
        var betaStacks = new Stacks("beta", StacksArgs.builder()
            .stage(beta)
            .stacks(Map.of("beta", StacksEntryArgs.builder()
                .stack(org + "/gcp-java-delivery-gke-depot-beta/beta")
                .source(code)
                .directory(path + "/beta")
                .config(imageStacks.outputs().applyValue(outputs ->
                    stackOutput(outputs, "image", "imageRef")
                        .map(imageRef -> Map.of("imageRef", imageRef))
                        .orElse(Map.of())))
                .build()))
            .build());

        var check = new Job("check-url", JobArgs.builder()
            .stage(beta)
            .source(code)
            .directory(path + "/pipeline")
            .command("./check-url.sh")
            .environment(betaStacks.outputs().applyValue(outputs ->
                stackOutput(outputs, "beta", "url")
                    .map(url -> Map.of("SERVICE_URL", url))
                    .orElse(Map.of())))
            .build(),
            // Delivery orders members by explicit dependencies, not by the
            // outputs they read. Without this the job starts alongside the
            // beta stack, before the URL exists.
            ComponentResourceOptions.builder().dependsOn(betaStacks).build());

        ctx.export("check", check.outputs());
    }

    // Stack outputs are empty until a stack has run once, and during preview.
    // Return a value only when it exists, so a missing one is left out of the
    // config instead of becoming the string "null".
    static Optional<String> stackOutput(
            Map<String, Map<String, Object>> outputs, String entry, String key) {
        return Optional.ofNullable(outputs)
            .map(o -> o.get(entry))
            .map(stack -> stack.get(key))
            .filter(String.class::isInstance)
            .map(String.class::cast);
    }
}
