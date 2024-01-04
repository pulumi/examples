# Contributing to Pulumi Examples

Pulumi welcomes contributions from the community and is excited to continue building out its collection of examples and tutorials that showcase the power of modern infrastructure as code. This guide is intended to
help your contribution get published quickly.

## Pulumi terminology

For a list of Pulumi terms used throughout our documentation site, see the [Glossary page](https://www.pulumi.com/docs/reference/glossary/).

## Example folder structure

The folder structure for each example includes a two-part prefix, `<cloud>-<language>` (to indicate which `<cloud>` and `<language>` it pertains to), and a brief descriptive name with hyphens in between the words.

The cloud prefix can be one of:

- `aws` for [Amazon Web Services](https://github.com/pulumi/pulumi-aws)
- `azure` for [Microsoft Azure](https://github.com/pulumi/pulumi-azure)
- `gcp` for [Google Cloud Platform](https://github.com/pulumi/pulumi-gcp)
- `kubernetes` for [Kubernetes](https://github.com/pulumi/pulumi-kubernetes),
- `digitalocean` for [DigitalOcean](https://github.com/pulumi/pulumi-digitalocean/)
- `f5bigip` for [F5's BIG-IP](https://github.com/pulumi/pulumi-f5bigip/)
- `cloud` for [Pulumi's cross-cloud programming framework](https://github.com/pulumi/pulumi-cloud), which is currently in preview
- Any [cloud provider](https://www.pulumi.com/registry) with a dedicated Pulumi package

The language prefix can be one of:
- `ts` for TypeScript
- `js` for JavaScript
- `py` for Python
- `go` for Golang
- `cs` for csharp

If you would like to add an example in a different language, see the FAQ section for [adding support for your favorite language](https://www.pulumi.com/docs/troubleshooting/faq/#how-can-i-add-support-for-my-favorite-language).

Each folder contains files related to your [Pulumi project](https://www.pulumi.com/docs/intro/concepts/project/), a README, an optional directory for your sample application (`www` for example), and an optional `images` directory if you're including images in your example.

```
|____README.md
|____www
|____images
| |____deploy.gif
| |____deploy.cast
|____Pulumi.yaml
|____package.json
|____tsconfig.json
|____index.ts
```

## Style

We are big fans of DigitalOcean's [technical writing guidelines](https://www.digitalocean.com/community/tutorials/digitalocean-s-technical-writing-guidelines#style) and highly encourage you to follow their style recommendations.

### README structure

Each example should include a README to give the readers a good walkthrough. It should comprise of the following sections:

- Title
- ["Deploy with Pulumi" button](https://www.pulumi.com/docs/intro/console/extensions/pulumi-button/) (Optional)
- Overview paragraph
- Prerequisites
- Deploy the App
   - Step 1: Doing the First Thing
   - Step 2: Doing the Next Thing
   …
   - Step n: Doing the Last Thing
- Clean Up
- Summary
- Next Steps (Optional)

See our [example README template](example-readme-template.md.txt) for detailed explanations on each section.

> The contribution guidelines have been authored in September 2019 and are subject to further refinements and tweaks. Examples prior to September 2019 do not necessarily conform to these guidelines.
