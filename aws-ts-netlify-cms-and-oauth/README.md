# Netlify CMS and OAuth on AWS

Netlify CMS web apps and all the templates provided on the [Netlify CMS website](https://www.netlify.com/integrations/templates/) are deployed on Netlify and live inside the target repositories a user would like to make changes to. However, in some cases we do not want the implementation details of the CMS to live in the target repositories, and we want to deploy it on AWS instead of Netlify. This example shows how to do this.

This directory contains two standalone Pulumi projects, each with its own README:

- [cms/](./cms) — a stand-alone React CMS app deployed as a static website on AWS S3, fronted by CloudFront and Certificate Manager. It can make edits to another target repository under the same account.
- [cms-oauth/](./cms-oauth) — an external OAuth client (adapted from a Go OAuth client example) deployed as an AWS Fargate service with its own domain and certificate, replacing Netlify's Identity Service for retrieving GitHub tokens.

Both `cms` and `cms-oauth` are deployed onto AWS and have their own domains. In the CMS configuration file `cms/public/config.yml`, you specify their domains in `site_domain` (the cms domain) and `base_url` (the cms-oauth domain) for Netlify CMS to reference. See the "Development Details" section of [cms/README.md](./cms/README.md).