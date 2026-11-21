// Copyright 2016-2026, Pulumi Corporation.  All rights reserved.

package image;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.command.local.LocalFunctions;
import com.pulumi.command.local.inputs.RunArgs;
import com.pulumi.dockerbuild.Image;
import com.pulumi.dockerbuild.ImageArgs;
import com.pulumi.dockerbuild.enums.Platform;
import com.pulumi.dockerbuild.inputs.BuildContextArgs;
import com.pulumi.dockerbuild.inputs.BuilderConfigArgs;
import com.pulumi.dockerbuild.inputs.RegistryArgs;
import com.pulumi.gcp.artifactregistry.Repository;
import com.pulumi.gcp.artifactregistry.RepositoryArgs;
import com.pulumi.gcp.artifactregistry.inputs.RepositoryCleanupPolicyArgs;
import com.pulumi.gcp.artifactregistry.inputs.RepositoryCleanupPolicyConditionArgs;
import com.pulumi.gcp.artifactregistry.inputs.RepositoryCleanupPolicyMostRecentVersionsArgs;
import com.pulumi.gcp.artifactregistry.inputs.RepositoryDockerConfigArgs;
import com.pulumi.gcp.organizations.OrganizationsFunctions;
import java.util.List;
import java.util.Map;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        var config = ctx.config();
        // Set by the pipeline: the commit being built.
        var commit = config.require("commit");
        // From the Depot ESC environment (pulumiConfig.depotProjectId).
        var depotProjectId = config.require("depotProjectId");
        var region = ctx.config("gcp").require("region");

        var keepTenNewest = RepositoryCleanupPolicyArgs.builder()
            .id("keep-10-most-recent")
            .action("KEEP")
            .mostRecentVersions(RepositoryCleanupPolicyMostRecentVersionsArgs.builder().keepCount(10).build())
            .build();
        var deleteAfterTwoWeeks = RepositoryCleanupPolicyArgs.builder()
            .id("delete-older-than-14-days")
            .action("DELETE")
            .condition(RepositoryCleanupPolicyConditionArgs.builder().tagState("ANY").olderThan("1209600s").build())
            .build();

        var repository = new Repository("images", RepositoryArgs.builder()
            .location(region)
            .repositoryId("gcp-java-delivery-gke-depot")
            .format("DOCKER")
            // A tag always points at the image built from that commit.
            .dockerConfig(RepositoryDockerConfigArgs.builder().immutableTags(true).build())
            // KEEP wins over DELETE: the 10 newest images survive regardless of age.
            .cleanupPolicies(keepTenNewest, deleteAfterTwoWeeks)
            .build());

        // Depot has no Pulumi provider, so register its buildx builder with a
        // script. An invoke runs on every preview and update, so every fresh
        // Delivery runner container gets the builder. The script reads
        // DEPOT_TOKEN from the stack's ESC environment.
        var builder = LocalFunctions.run(RunArgs.builder()
                .command("bash ./setup-builder.sh")
                .environment(Map.of("DEPOT_PROJECT_ID", depotProjectId))
                .build())
            .applyValue(result -> result.stdout().trim());

        // A short-lived OAuth token from the stack's GCP login, used to push.
        var accessToken = OrganizationsFunctions.getClientConfig()
            .applyValue(c -> c.accessToken())
            .asSecret();

        var imageName = "app";
        var app = new Image(imageName, ImageArgs.builder()
            .builder_(BuilderConfigArgs.builder().name(builder).build())
            // The Depot builder has one node per platform. The embedded buildx
            // joins their images with the host's Docker credentials, not
            // `registries`, and fails with 403. The buildx CLI gets
            // `registries` in its DOCKER_CONFIG.
            .exec(true)
            .context(BuildContextArgs.builder().location("../app").build())
            .platforms(Platform.Linux_amd64)
            .tags(repository.registryUri().applyValue(uri -> List.of(uri + "/" + imageName + ":" + commit)))
            .push(true)
            .registries(RegistryArgs.builder()
                .address(repository.registryUri().applyValue(uri -> uri.substring(0, uri.indexOf('/'))))
                .username("oauth2accesstoken")
                .password(accessToken)
                .build())
            .build());

        // The pushed image, pinned by digest. Later stages deploy this exact image.
        ctx.export("imageRef", app.ref());
        ctx.export("repositoryUrl", repository.registryUri());
    }
}
