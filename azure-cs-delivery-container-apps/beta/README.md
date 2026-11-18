# Beta Container App

This project runs in the pipeline's `beta` stage. It creates a Container Apps environment and a Container App that runs the image the build stage pushed, from the `imageRef`, `registryName` and `resourceGroupName` config the pipeline sets from the image stack's outputs. It looks the registry's admin credentials up itself, because the pipeline passes only plain configuration values between stacks. It exports the app's `url`. See the [example's README](../README.md) to set it up.
