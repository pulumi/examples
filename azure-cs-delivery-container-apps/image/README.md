# Container image

This project runs in the pipeline's `build` stage. It creates a resource group and an Azure Container Registry with the admin user enabled, then builds [`app/`](../app) and pushes the image, tagged with the commit the pipeline sets as `commit`. It exports `imageRef`, the image reference pinned by digest, and the registry's `registryName` and `resourceGroupName`. See the [example's README](../README.md) to set it up.
