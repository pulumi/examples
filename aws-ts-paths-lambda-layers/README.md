# Using tsconfig-paths with Lambda layers

This example demonstrates how to use the `paths` option of the TypeScript compiler to map a locally defined Node.js module in a way that allows it to be used in an AWS Lambda layer.

## Install Pulumi project dependencies

```bash
npm install
```

## Install and build the local Node module

```bash
npm -C layers/utils install
npm -C layers/utils run build
```

## Deploy the API Gateway

```bash
pulumi up
```

## Test the endpoint

```bash
curl $(pulumi stack output url)
```
