import * as pulumi from "@pulumi/pulumi";
import * as k8s from "@pulumi/kubernetes";
import * as k8sOutput from "@pulumi/kubernetes/types/output";
import * as k8sapi from '@kubernetes/client-node';
import { unknownValue } from "@pulumi/pulumi/runtime";

// Create a Kubernetes Job with a single container running the "hello-world" image
const job = new k8s.batch.v1.Job("job", {
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "helloworld",
                    image: "hello-world",
                }],
                restartPolicy: "Never",
            },
        },
    },
});

// Define an async function to wait for a Kubernetes Job to complete
async function waitForJob(jobMetadata: k8sOutput.meta.v1.ObjectMeta): Promise<any> {
    // Only run the waitForJob function during a non-dryRun
    if (!pulumi.runtime.isDryRun()) {

        // Load the default KubeConfig from the local environment
        const kc = new k8sapi.KubeConfig();
        kc.loadFromDefault();

        // Initialize a Kubernetes API client using the loaded KubeConfig
        const client = kc.makeApiClient(k8sapi.BatchV1Api);

        // Poll the Kubernetes Job status every 10 seconds for up to 10 minutes
        for (let i = 0; i <60; i++) {
            const jobDetails = (await client.readNamespacedJob(jobMetadata.name, jobMetadata.namespace)).response;
                if (jobDetails.body && jobDetails.body.status && jobDetails.body.status.succeeded > 0) {
                // Return the Job details once completed successfully
                return jobDetails.body;
            }
            pulumi.log.info(`Waiting for Job to finish (${i})`, job)
            // Wait for 10s between polls
            await new Promise(r => setTimeout(r,10000));
        }
        // Throw an error if the Job did not complete within the 10-minute timeout
        throw new Error("timed out waiting for Job to complete");
    }

    const unknown = (pulumi as any).unknown;
    return { status: { completionTime: unknown} };
}

// WaitForJob for the first Kubernetes Job to complete
const jobDone = job.metadata.apply(metadata => waitForJob(metadata));

// Create a second Kubernetes Job with data dependency on the completion of the first Kubernetes Job
const job2 = new k8s.batch.v1.Job("job2", {
    metadata: {
        annotations: {
            // Assign the completionTime of the first Job to an annotation on the second Job
            // This enforces a dependency relationship between the jobs
            "pulumi-waited-on-completion": jobDone.apply(j => j.status.completionTime),
        }
    },
    spec: {
        template: {
            spec: {
                containers: [{
                    name: "helloworld",
                    image: "hello-world",
                }],
                restartPolicy: "Never",
            },
        },
    },
});
// WaitForJob for the second Kubernetes Job to complete
const job2Done = job2.metadata.apply(metadata => waitForJob(metadata));

// Export resource IDs and status details
export const jobId = job.id;
export const jobStatus = job.status;
export const jobDoneDetails = jobDone;
export const job2DoneDetails = job2Done;
