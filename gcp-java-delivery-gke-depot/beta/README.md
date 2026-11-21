# Beta GKE service

This project runs in the pipeline's `beta` stage. It creates a GKE Autopilot cluster and runs the image the build stage pushed, from the `imageRef` config the pipeline sets from the image stack's output, as a Kubernetes Deployment behind a LoadBalancer Service. It connects to the cluster with a short-lived access token from the stack's Google Cloud login, so it needs no `gke-gcloud-auth-plugin`. The Service forwards port 80 to the app's port 8080. It exports the app's `url`. See the [example's README](../README.md) to set it up.
