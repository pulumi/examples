// from https://github.com/pulumi/examples/blob/8cc8b1a4384c8b33f70ba65c701e19daecfa6399/aws-ts-s3-folder/index.ts
package s3site;

import com.pulumi.Context;
import com.pulumi.Pulumi;
import com.pulumi.asset.FileAsset;
import com.pulumi.aws.s3.BucketObject;
import com.pulumi.aws.s3.BucketObjectArgs;
import com.pulumi.aws.s3.BucketPolicy;
import com.pulumi.aws.s3.BucketPolicyArgs;
import com.pulumi.awsnative.s3.Bucket;
import com.pulumi.awsnative.s3.BucketArgs;
import com.pulumi.awsnative.s3.inputs.BucketWebsiteConfigurationArgs;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.function.BiConsumer;

public class App {
    public static void main(String[] args) {
        Pulumi.run(App::stack);
    }

    private static void stack(Context ctx) {
        final var siteBucket = new Bucket("s3-website-bucket",
                BucketArgs.builder().websiteConfiguration(BucketWebsiteConfigurationArgs.builder()
                        .indexDocument("index.html")
                        .build()).build());

        final String siteDir = "www/";
        forEachFileInTree(siteDir, (path, contentType) -> {
            new BucketObject(path.toString().replace(siteDir, ""),
                    BucketObjectArgs.builder().bucket(siteBucket.getId())
                            .source(new FileAsset(path.toAbsolutePath().toString()))
                            .contentType(contentType).build()
            );
        });

        final var bucketPolicy = new BucketPolicy("bucketPolicy",
                BucketPolicyArgs.builder().bucket(siteBucket.getId())
                        .policy(siteBucket.arn()
                                .applyValue(bucketArn -> """
                                            {
                                                "Version":"2012-10-17",
                                                "Statement":[{
                                                    "Effect":"Allow",
                                                    "Principal":"*",
                                                    "Action":["s3:GetObject"],
                                                    "Resource":["%s/*"]
                                                }]
                                            }
                                        """.formatted(bucketArn))
                        ).build());

        ctx.export("bucketName", siteBucket.bucketName());
        ctx.export("websiteUrl", siteBucket.websiteUrl());
    }

    private static void forEachFileInTree(String siteDir, BiConsumer<Path, String> consumer) {
        try (var paths = Files.walk(Paths.get(siteDir)).filter(Files::isRegularFile)) {
            paths.forEach(path -> {
                final String contentType;
                try {
                    contentType = Files.probeContentType(path);
                } catch (IOException e) {
                    throw new RuntimeException(String.format("Failed to probeContentType for path: '%s'", path), e);
                }
                consumer.accept(path, contentType);
            });
        } catch (IOException e) {
            throw new RuntimeException(String.format("Failed to walk a path: '%s'", siteDir), e);
        }
    }
}
