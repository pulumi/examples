// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as pulumi from "@pulumi/pulumi";

// Utility function that creates a container that `curl`s a URL, placing it in a file in some shared
// volume, namely at `${mount.mountPath}/${fileName}`. For example, `mount.mountPath` might be the
// nginx config path, `/etc/nginx/conf.d`, and `filename` might be the default file, `default.conf`.
// This container would them place them in the shared volume at `/etc/nginx/conf.d/default.conf`.
export function curl(
    url: pulumi.Output<string>,
    fileName: string,
    mount: { name: pulumi.Input<string>; mountPath: pulumi.Input<string> },
) {
    return {
        name: "curl",
        image: "byrnedo/alpine-curl",
        args: pulumi
            .all([url, mount.mountPath])
            .apply(([url, mountPath]) => ["-o", `${mountPath}/${fileName}`, "-sL", url]),
        volumeMounts: [mount],
    };
}
