# Container image

This project runs in the pipeline's `build` stage. It creates an Amazon ECR repository, then builds [`app/`](../app) for `linux/amd64` and pushes the image, tagged with the commit the pipeline sets as `commit`. It logs in to ECR with a short-lived token from the stack's AWS credentials. It exports `imageRef`, the image reference pinned by digest. See the [example's README](../README.md) to set it up.
