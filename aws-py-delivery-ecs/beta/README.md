# Beta ECS service

This project runs in the pipeline's `beta` stage. It creates an ECS cluster, a public Application Load Balancer in the default VPC, and an ECS Fargate service that runs the image the build stage pushed, from the `imageRef` config the pipeline sets from the image stack's output. The load balancer forwards port 80 to the app's port 8080. It exports the app's `url`. See the [example's README](../README.md) to set it up.
