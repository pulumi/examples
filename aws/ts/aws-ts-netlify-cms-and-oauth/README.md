# About the CMS and OAuth
Netlify CMS web apps and all the templates they have given on [Netlify CMS website](https://www.netlifycms.org/docs/start-with-a-template/) deployed on Netlify and lies inside the target repositories user would like to make change. However, in some case, we do not want the implementation detail of the CMS to locate in the target repositories and we want to deploy it on AWS instead of Netlify. This example shows how to do this.

Both folder has README.md inside them here are some general thoughts:

## ./cms
- It contains implementation that made the CMS app a stand-alone React App that is not located inside the target repositories. Now it is able to make edits to another target repository that is under the same account. Moreover, the infrastructure deployes the cms app as a static website onto the AWS S3 and use AWS CloudFront to connect to the CDN and Certificate Manger to provide certificate.

## ./cms-oauth
Because we are deploying the CMS onto the AWS rather than Netlify, we could not use Netlify's Identity Service to retrieve Github tokens to access. Therefore we have build the [External OAuth Client](https://www.netlifycms.org/docs/external-oauth-clients/#header). We made some changes to the existing Golang OAuth Client example to make it work. Also, we deployed it on AWS by specify a Fargate Service and generated its domain and certificate as well.

## How two part fit together
Both cms and cms-oauth are deployed onto the AWS and have their own domains. In cms configuration yaml file cms/public/config.yml, we specify their domain in the site_domain (cms domain) and base_url (cms-oauth domain) for Neltify CMS to reference.
See "Development Details" section of cms/README.md