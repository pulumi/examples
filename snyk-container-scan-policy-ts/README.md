# snyn-container-scan-policy

Scan Pulumi-managed Docker containers with Snyk and Pulumi Policy as Code:

- The code in the `infra` directory creates two `docker.Image` resources:
    1. An image sourced from the `alpine` image, which does not have critical vulnerabilities.
    1. An image sourced from the `debian` image, which has critical vulnerabilities.
- The code in the `policy` directory contains a Pulumi Policy Pack which calls the Snyk CLI. If the Snyk CLI fails (e.g. because it detects vulnerabilities), the resource will be considered in violation and the `pulumi preview` (or `pulumi up`) operation will fail.

To run the demo:

```bash
cd infra
pulumi preview --policy-pack ../policy
```

## Configuration Options

The `snyk-container-scan` policy has the following configurable options. These can be set by altering values in `policy-config.json` and calling Pulumi CLI with the `--policy-config` option, e.g.:

```bash
cd infra
pulumi preview --policy-pack ../policy --policy-pack-config policy-config.json
```

- `dockerfileScanning` (boolean): If set to `true`, Snyk will scan the Dockerfile of each image in the stack to scan for vulnerabilities in the upstream image. If set to `true`, `pulumiProgramAbsPath` must also be set to the absolute path on disk of the Pulumi program that contains the images so that the Snyk CLI can locate the Dockerfile.
- `excludeBaseImageVulns` (boolean): If true, do not show vulnerabilities introduced only by the base image. Defaults to `false`.
- `failOn`: Valid values: `all`, `upgradable`. Defaults to `all`.
- `pulumiProgramAbsPath` (string, optional): The absolute path on disk to the Pulumi (IaC) program. Used by Snyk to scan Dockerfiles for vulnerabilities. Only used (and required) if `dockerfileScanning` is set to `true`.
- `severityThreshold`: The minimum severity of found issues to report. If any issues are found at or above the minimum severity, the stack will contain violations. Valid values: `low`, `medium`, `high`, `critical`. Defaults to `critical`.

For additional information on Snyk CLI options, see: <https://docs.snyk.io/snyk-cli/commands/container-test>

## Enabling Dockerfile Scanning

Snyk can scan Dockerfiles for vulnerabilities. Because there's no direct relationship between the location on disk of a Pulumi program and any policy packs that might be running, we need to configure the Snyk policy to know where the Pulumi program is running.

The following script will add the needed absolute path configuration:

```bash
cd infra
./add-dockerfile-scanning.sh
```

Because Dockerfile scanning requires the absolute path to the Pulumi program to be supplied via policy configuration, server-side policy enforcement requires that the Pulumi program be run from a known location on disk (i.e. whatever the path on disk is that the policy is configured with in the Pulumi Cloud console) if Dockerfile scanning is desired. If <https://github.com/pulumi/pulumi-policy/issues/333> is implemented, this restriction can be lifted and the configuration value can be removed.

## Troubleshooting

### Failed to connect to Docker Daemon

If Pulumi gives the following error:

```text
Docker native provider returned an unexpected error from Configure: failed to connect to any docker daemon
```

Start Docker Desktop on your machine.

### Snyk Unable to find Docker Socket

If the Snyk CLI gives you an error similar to the following:

```text
connect ENOENT /var/run/docker.sock
```

You may need to set the `DOCKER_HOST` environment variable. At the time of writing, the Snyk CLI appears to assume that the Docker socket is running in the older (privileged) location. The newer version of Docker use a socket placed in the current user's home directory, e.g.:

```bash
export DOCKER_HOST=unix:///Users/jkodroff/.docker/run/docker.sock
```
