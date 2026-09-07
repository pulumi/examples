<!--
Use this template as a starting point when writing a README for a Pulumi example.
Copy this file into your example folder, rename it to `README.md`, then replace the
guidance comments with your own content. Preview in GitHub's Markdown view to check
formatting.

Pick the section set that matches your example type (see CONTRIBUTING.md):

- Type A — Deployable: a single Pulumi project the reader stands up with `pulumi up`.
  Use ALL the sections below. Your Pulumi.yaml MUST include a `template:` block.
- Type B — Non-deployable: unit tests, policy packs, integration-test harnesses.
  Drop the deploy button and the Prerequisites/Deploy/Clean up/Summary flow. Instead
  use a single action section named for the real workflow ("Running the tests",
  "Using this policy pack") followed by a "Learn more" links section.
- Type C — Multi-project/index: a directory of sub-projects. Keep the title and intro,
  then list each sub-project with a one-line description and a link; let each
  sub-project carry its own Type A/B README.

Test your walkthrough end to end: paste each command into a terminal so there are no
typos or missing steps. If you run a command that isn't in the README, add it.
-->

[![Deploy this example with Pulumi](https://www.pulumi.com/images/deploy-with-pulumi/dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/<example-dir>/README.md#gh-light-mode-only)
[![Deploy this example with Pulumi](https://get.pulumi.com/new/button-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/<example-dir>/README.md#gh-dark-mode-only)

<!-- Type A only. Replace <example-dir> with your folder name. Omit the button for Type B. -->

# App description using a service or tool

<!-- Use sentence case for the title and all headings: capitalize only the first word
and proper nouns / product names (AWS, Amazon S3, Kubernetes, Pulumi, API Gateway,
etc.), and don't end headings with punctuation. Examples become tutorials on
https://www.pulumi.com/docs/, sorted by cloud and language, so there's no need to put
the cloud provider or language in the title unless it's needed to disambiguate. -->

One or two sentences on what this example builds and why a reader would care. If it
helps, follow with a short bulleted list of the key resources it creates:

It creates:

- A **thing** that does X.
- A **second thing** wired to the first.

## Prerequisites

<!-- An ordered list of what to install/configure before deploying. -->

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure your cloud credentials](https://www.pulumi.com/docs/intro/cloud-providers/) <!-- link the specific provider setup page -->
1. [Install the language runtime](https://www.pulumi.com/docs/intro/languages/) <!-- link the specific language page -->

## Deploying the example

<!-- A single ordered list: init the stack, set config, install deps, deploy, verify.
Headings use the "-ing" form; step text uses imperative verbs. -->

1.  Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1.  Set the required configuration:

    ```bash
    pulumi config set aws:region us-west-2
    ```

1.  Install dependencies:

    ```bash
    npm install
    ```

1.  Deploy the stack:

    ```bash
    pulumi up
    ```

1.  Verify the result using the stack outputs:

    ```bash
    pulumi stack output
    ```

## Cleaning up

To remove the resources and the stack:

```bash
pulumi destroy
pulumi stack rm
```

## Summary

<!-- Optional but encouraged. A short recap of what the reader deployed and where to
take it next. -->

## Next steps

<!-- Optional. An unordered list of related Pulumi tutorials or docs. -->
