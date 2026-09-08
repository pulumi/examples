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
- Any [cloud provider](https://www.pulumi.com/registry) with a dedicated Pulumi package

The language prefix can be one of:
- `ts` for TypeScript
- `js` for JavaScript
- `py` for Python
- `go` for Golang
- `cs` for csharp
- `hcl` for [Pulumi HCL](https://www.pulumi.com/docs/languages-sdks/hcl/)

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

Each example should include a README that walks the reader through the example. The
structure depends on which of three types the example is:

- **Type A — Deployable**: a single Pulumi project the reader stands up with
  `pulumi up`. This is the large majority of examples. Its `Pulumi.yaml` **must**
  include a `template:` block declaring the config the program reads (with a
  `description` and sensible `default`), which is what makes it a real,
  one-click-deployable template.
- **Type B — Non-deployable**: illustrates a technique rather than a live stack —
  unit tests (`testing-unit-*`), integration harnesses (`testing-integration*`),
  and policy packs (`policy-packs/*`). These are run via a test or lint command,
  not `pulumi up`.
- **Type C — Multi-project / index**: a directory of sub-projects or variants. The
  top-level README orients the reader and links to each sub-project, which carries
  its own Type A/B README.

**Type A** READMEs comprise these sections, in this order:

- ["Deploy with Pulumi" button](https://www.pulumi.com/docs/intro/console/extensions/pulumi-button/)
- Title (sentence case)
- Overview paragraph (optionally followed by an "It creates:" resource list)
- `## Prerequisites`
- `## Deploying the example`
- `## Cleaning up`
- `## Summary` (optional)
- `## Next steps` (optional)

Action-section headings use the "-ing" gerund form (`## Deploying the example`,
`## Cleaning up`, `## Running the tests`); step text within them uses imperative verbs
("Deploy the stack", "Remove the resources"). `## Prerequisites`, `## Summary`, and
`## Next steps` keep their noun form.

All headings, including the H1 title, use **sentence case** per the [Pulumi brand
writing-style guidelines](https://www.pulumi.com/brand/) — capitalize only the first
word and proper nouns / product names (AWS, Amazon S3, Kubernetes, Pulumi, API Gateway,
NGINX, TypeScript, and the like). Don't end headings with punctuation.

**Type B** READMEs omit the deploy button and the deploy/clean-up flow. Use a title,
an overview paragraph, an optional `## Prerequisites`, an action section named for the
real workflow (`## Running the tests`, `## Using this policy pack`), and a
`## Learn more` links section.

**Type C** READMEs keep the title and overview, then list each sub-project with a
one-line description and a link. Any deploy button points at the specific deployable
sub-project.

Use these exact section headings so examples stay consistent. See our
[example README template](example-readme-template.md.txt) for detailed explanations of
each section.

> The contribution guidelines have been authored in September 2019 and are subject to further refinements and tweaks. Examples prior to September 2019 do not necessarily conform to these guidelines.
