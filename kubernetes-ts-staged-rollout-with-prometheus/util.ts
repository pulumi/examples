// Copyright 2016-2019, Pulumi Corporation.  All rights reserved.

import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

import { spawn } from "child_process";
import * as http from "http";

export interface PromPortForwardOpts {
    localPort: number;
    targetPort?: number;
}

// Use `kubectl port-forward` to forward Prometheus service locally; because this command will run
// forever, this function returns a handle to the process that must be called to kill the process.
// Usually you want to pass this in to `checkHttpLatency`, which will properly clean this up:
//
//     util.checkHttpLatency(canary, containerName, {forwarderHandle: forwarderHandle [...]})
//
// This is useful for when we can't run Pulumi in-cluster, in which case simply calling to the
// appropriate KubeDNS URL is not sufficient.
export function forwardPrometheusService(
    service: pulumi.Input<k8s.core.v1.Service>,
    deployment: pulumi.Input<k8s.extensions.v1beta1.Deployment>,
    opts: PromPortForwardOpts,
): pulumi.Output<() => void> {
    if (pulumi.runtime.isDryRun()) {
        return pulumi.output(() => undefined);
    }

    return pulumi.all([service, deployment]).apply(([s, d]) => pulumi.all([s.metadata, d.urn])).apply(([meta]) => {
        return new Promise<() => void>((resolve, reject) => {
            const forwarderHandle = spawn("kubectl", [
                "port-forward",
                `service/${meta.name}`,
                `${opts.localPort}:${opts.targetPort || 80}`,
            ]);

            // NOTE: we need to wrap `forwarderHandle.kill` because of JavaScript's `this`
            // semantics.
            forwarderHandle.stdout.on("data", data => resolve(() => forwarderHandle.kill()));
            forwarderHandle.stderr.on("data", data => reject());
        });
    });
}

export interface CheckLatencyOpts {
    // Duration of time to periodically poll latency metrics. In seconds.
    durationSeconds: number;

    // Period of time to wait between polling metrics. In seconds. Defaults to 1.
    periodSeconds?: number;

    // Quantile of latency responses to check. One of: {0.9 | 0.99}.
    quantile: 0.9 | 0.99;

    // Threshold on which we will fail the deployment. In microseconds.
    thresholdMicroseconds: number;

    // Location of the Prometheus endpoint to query.
    prometheusEndpoint: string;

    forwarderHandle: pulumi.Output<() => void>;
}

// Polls Prometheus on some customizable period and checks that the HTTP request latency for a
// specified quartile does not exceed some maximum threshold.
export function checkHttpLatency(
    canary: k8s.apps.v1beta1.Deployment,
    containerName: string,
    opts: CheckLatencyOpts,
): pulumi.Output<string> {
    if (pulumi.runtime.isDryRun()) {
        return pulumi.output(Promise.resolve("<computed value>"));
    }

    const url = `http://${
        opts.prometheusEndpoint
    }/api/v1/query?query=http_request_duration_microseconds%7Bjob%3D%22kubernetes-pods%22%2C%20app%3D%22${containerName}%22%7D`;

    //
    // Turn an `http.get` into a `Promise<string>`.
    //

    const kill = opts.forwarderHandle || (() => undefined);
    return pulumi.all([canary.urn, kill]).apply(([_, kill]) => {
        console.log("Checking HTTP metrics");

        // Poll Prometheus for metrics. If they drop below the specified threshold, we return error
        // immediately.
        return pollP8s(url, opts).then(latency => {
            kill();
            return latency;
        });
    });
}

function pollP8s(url: string, opts: CheckLatencyOpts): Promise<string> {
    let timedOut = false;
    setTimeout(_ => {
        timedOut = true;
    }, opts.durationSeconds * 1000);

    function pollRecursive(): Promise<string> {
        return getHttpLatency(url).then(bodyText => {
            //
            // Validate that the HTTP latency in microseconds has not gone above the safe threshold.
            // If it has, reject, and if it hasn't, recursively poll until the timeout.
            //
            let microseconds = "";
            const kontinue = () => {
                return new Promise<string>(resolve =>
                    setTimeout(_ => {
                        resolve(microseconds);
                    }, (opts.periodSeconds || 1) * 1000),
                ).then(pollRecursive);
            };

            const body = JSON.parse(bodyText);
            if (body.data.result.length === 0) {
                if (timedOut) {
                    throw new Error(`Failed metrics check: no HTTP latency measurements returned`);
                }
                // No data yet. Return.
                return kontinue();
            }
            for (const result of body.data.result) {
                const quantile = result.metric["quantile"];
                microseconds = result.value[1];

                // Check HTTP latency metrics. Recursively poll if the metrics have not met the
                // unacceptable latency threshold.
                if (quantile === opts.quantile) {
                    if (microseconds === "" || microseconds === "NaN") {
                        if (timedOut) {
                            throw new Error(
                                `Failed metrics check: querying HTTP latency got '${microseconds}'`,
                            );
                        }
                        // Ignore invalid data.
                        return kontinue();
                    }

                    if (parseFloat(microseconds) > opts.thresholdMicroseconds) {
                        console.error(
                            `Failed metrics check: required < ${opts.thresholdMicroseconds.toString()} microseconds, got '${microseconds}'`,
                        );
                        throw new Error(
                            `Failed metrics check: required < ${opts.thresholdMicroseconds.toString()} microseconds, got '${microseconds}'`,
                        );
                    }

                    if (timedOut) {
                        return Promise.resolve(microseconds);
                    }
                    return kontinue();
                }
            }
            throw new Error(
                `Failed metrics check: required < 20000 microseconds, got '${microseconds}'`,
            );
        });
    }

    return pollRecursive();
}

function getHttpLatency(url: string): Promise<string> {
    //
    // Turn Prometheus metrics check into a `Promise<string>`
    //

    return new Promise<string>((resolve, reject) => {
        const request = http.get(url, response => {
            if (
                response.statusCode === undefined ||
                response.statusCode < 200 ||
                response.statusCode > 299
            ) {
                reject(new Error("Failed to load page, status code: " + response.statusCode));
            }

            // Append to the body until the end.
            const body: string[] = [];
            response.on("data", chunk => body.push(chunk.toString()));
            response.on("end", () => resolve(body.join("")));
        });

        // Handle error case.
        request.on("error", err => reject(err));
    });
}
