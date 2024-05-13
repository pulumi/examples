[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-netlify-cms-and-oauth/cms-oauth/README.md#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/aws-ts-netlify-cms-and-oauth/cms-oauth/README.md#gh-dark-mode-only)

# About the Project

This OAuth Server Project is connected with CMS project which deploy on AWS S3 rather than on Netlify. In this way, it requires us to create a OAuth Client Server for Netlify CMS. Netlify use the Netlify Identity Service which provides OAuth provider server. Based on [Netlify's instruction](https://www.netlifycms.org/docs/external-oauth-clients/) of customize this step we need to provide our own OAuth client.

In this example, we are using [Netlify CMS's Github backends](https://www.netlifycms.org/docs/github-backend/) for CMS, but the OAuth Provider code enabled more types of backends Bitbucket and Gitlab. If you are using these [backends](https://www.netlifycms.org/docs/backends-overview/), simply update the callback url you are register Github OAuth Applicationc (See step 1 in the Getting Started section) to be https://{{the domain of your OAuth App}}/bitbucket/callback or https://{{the domain of your OAuth App}}/gitlab/callback

## References

The provider's content code is referencing to the [External OAuth Client example from Netlify CMS](https://www.netlifycms.org/docs/external-oauth-clients/).
Here are some reference:
- @igk1972 [OAuth provider](https://github.com/igk1972/netlify-cms-oauth-provider-go) Thanks to Igor Kuznetsov for writing go code for OAuth Provider and it's frontend in file main.go. We updated the code in these ways:
  - Now we have set the [Github scope](https://developer.github.com/apps/building-oauth-apps/understanding-scopes-for-oauth-apps/) (which variable specify what kind of access we want) to be public_repo (only permits read and write on the public repo). See line 132 of main.go for setting different scope.
  - We also changed line 34 which fail to do JSON.stringify() the provided result
  - We deleted "https://" when it is trying to concate with "/auth" because the environment variable HOST already contain "https://"
  - We change line 158 the port that OAuth Server is listen to. Now the http is listen and serve for the port of the target group we set as Pulumi stack configuration and environment variable. The default value for the target group is 80 which is port for the local development. You could change the default port by specify the optional Pulumi config targetGroup Port.
- pulumi's [hello fargate example](https://github.com/pulumi/examples/tree/master/aws-ts-hello-fargate) for connecting to AWS Fargate to adopt Docker setting in cloud
- pulumi's [static website example](https://github.com/pulumi/examples/tree/master/aws-ts-static-website) for configuring certificate and obtain a subdomain for the provider server

## File Structure

- ./infrastructure
  - Pulumi code with setting up AWS Fargate and the configuring certificate and domain
- ./main.go the code for the provider itself and it's front end
  - It is fetching the access token sent from Github API using Github's goth library.
- .github/workflow contain code for the workflow

## Infrastructure

The OAuth Client Server was deployed on AWS using Pulumi. The Pulumi code uses AWS Certificate Manager to create certificate and validate it. It is using AWS ECS Fargate to read docker image and establish a Fargate Service. Then it is also creating Alias Record on Route53 for the OAuth Server.

### Assume Role (Optional)

It is recommended that you use an IAM role with more permissions in the _target_ AWS using a token for an IAM user in the _source_ account. To do this, you could refer to the [aws-ts-assume-role example](https://github.com/pulumi/examples/tree/master/aws-ts-assume-role) for more information. The example is available in multiple languages in our [examples repostiory](https://github.com/pulumi/examples).

# Getting Started (Replace content in {{}} with correct informations)

These steps are now automated using the Github Workflow. If you push to the master or merge a pull request, the OAuth Client Server would be automatically deployed. Open a new branch and push to the branch would only do a pulumi preview where the logs could be check on Github Actions.

### Step 1. Register OAuth Application in Github and Obtain Key and Secret

- Now it is using the OAuth Application in Pulumi's Github organization account
- Steps are provided using this link https://docs.netlify.com/visitor-access/oauth-provider-tokens/#setup-and-settings
- For the Home Page Url should be link to cms's website
- For the Authorization callback URL enter https://{{the domain of your OAuth App}}/github/callback

### Step 2. Fill in the Pulumi configuration

1. Make sure you are on the root directory of this repo.

2. Get into the infrastructure folder and initialize a new stack
```bash
$ cd infrastructure
$ pulumi stack init {{oauth-provider}} # any name you want for your pulumi stack
```

3. Set AWS Region
```bash
$ pulumi config set aws:region us-east-1
```
- It has to be set as us-east-1 because ACM certificate must be in the us-east-1 region.

4. Set Target Domain of OAuth Provider
```bash
$ pulumi config set netlify-cms-oauth-provider-infrastructure:targetDomain {{"domain name of your oauth provider"}}
```

5. Set the Github Key and Secret (only do this if you want a personal test, the Github Key and Secret is now provided by the OAuth application in pulumi Github account)
- change the {YOUR_GITHUB_KEY} and {YOUR_GITHUB_SECRET} with the key and secret obtain from Step 1.
```bash
$ pulumi config set netlify-cms-oauth-provider-infrastructure:githubKey {{YOUR_GITHUB_KEY}}
$ pulumi config set --secret netlify-cms-oauth-provider-infrastructure:githubSecret
$ {{YOUR_GITHUB_SECRET}}
```
- `--secret` tag is used to hash the secret so on the stack configuration yaml file it won't be shown
- Don't directly append the secret to the command like this ` $ pulumi config set --secret netlify-cms-oauth-provider-infrastructure:githubKey {{YOUR_GITHUB_SECRET}} `
because it might cause the secret be stored inside the command memory
  - Only specify the key without name and hit ENTER key, then you are able to type secret on next line(won't actually show the value)
- To make sure if key and secret is right do
```bash
$ pulumi config get netlify-cms-oauth-provider-infrastructure:githubKey
$ pulumi config get netlify-cms-oauth-provider-infrastructure:githubSecret
```

### Step 3. Running Infrastructure

```bash
$ pulumi up
```

### Step 4. Config CMS

You also need to add `base_url` to the backend section of your netlify-cms's config file.

Go to the cms repo which stores resource for CMS and on file public/config.yml add the base_url line with the oauth provider url

```
backend:
  name: github
  repo: user/repo   # Path to your Github repository
  branch: master    # Branch to update
  base_url: https://xxx # Path to ext auth provider
```

Then build use
```bash
$ yarn build
```
and go to the infrastructure folder and do pulumi up to update changes
