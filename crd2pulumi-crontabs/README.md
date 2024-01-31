[![Deploy](../.buttons/deploy-with-pulumi-dark.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/crd2pulumi-crontabs/kubernetes-ts-crontabs/index.ts#gh-light-mode-only)
[![Deploy](../.buttons/deploy-with-pulumi-light.svg)](https://app.pulumi.com/new?template=https://github.com/pulumi/examples/blob/master/crd2pulumi-crontabs/kubernetes-ts-crontabs/index.ts#gh-dark-mode-only)

# Generating CronTab CustomResources with `crd2pulumi`

This example generates a strongly-typed CronTab CustomResource from the Kubernetes CRD specified in `crontabs.yaml` in TypeScript and Go. Afterwards, we'll use this generated code with Pulumi to deploy the CRD and create an instance. For more documentation on `crd2pulumi`, check out the [project's GitHub page](https://github.com/pulumi/pulumi-kubernetes/tree/master/provider/cmd/crd2pulumi).

## Setting up crd2pulumi

We'll set up `crd2pulumi` by downloading the latest binary. If you're interested in building `crd2pulumi` itself, you can find instructions in the project [README](https://github.com/pulumi/pulumi-kubernetes/tree/master/provider/cmd/crd2pulumi).

You can find the download links for the [latest binaries on GitHub](https://github.com/pulumi/pulumi-kubernetes/releases/tag/crd2pulumi/v1.0.0). For this example we're using `darwin-amd64`, so if you're using a different OS, make sure to use the correct download link.

```bash
$ wget https://github.com/pulumi/pulumi-kubernetes/releases/download/crd2pulumi%2Fv1.0.0/crd2pulumi-darwin-amd64.tar.gz
$ tar -xvf crd2pulumi-darwin-amd64.tar.gz
$ mv ./releases/crd2pulumi-darwin-amd64/crd2pulumi ./crd2pulumi
```

## Running the App (TypeScript)

Follow the steps in [Pulumi Installation and Setup](https://www.pulumi.com/docs/get-started/install/) and [Configuring Pulumi
Kubernetes](https://www.pulumi.com/docs/intro/cloud-providers/kubernetes/setup/) to get setup with Pulumi and Kubernetes.

Install dependencies:

```bash
$ cd kubernetes-ts-crontabs
$ npm install
```

Create a new stack:

```bash
$ pulumi stack init dev
```

At first, the provided `index.ts` program shouldn't run, since we haven't actually generated the `./crontabs` code yet.

> `crontabs.yaml` is a k8s CRD that specifies a CronTab CustomResource. It's also used as an example in the [Kubernetes Documentation](https://kubernetes.io/docs/tasks/extend-kubernetes/custom-resources/custom-resource-definitions/).

Generate the strongly-typed CronTab resource in the current directory:

```bash
$ ../crd2pulumi nodejs ../crontabs.yaml .
```

This should generate a `./crontabs` folder, where we can import the useful classes `v1.CronTab` and `NewCronTabDefinition`.
> This saves us a lot of time, since we can create the CRD in a single line and get typed arguments in the CustomResource. If you're curious, the comments contain the code that we would've written without `crd2pulumi`.

Perform the deployment:

```bash
$ pulumi up
Previewing update (dev):
 	Type                                                     	Name               	Plan
 	pulumi:pulumi:Stack                                      	examples-dev
 +   ├─ kubernetes:stable.example.com:CronTab                 	my-new-cron-object 	create
 +   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  my-crontab-definition  create
Resources:
	+ 2 to create
	1 unchanged
Do you want to perform this update? yes
Updating (dev):
 	Type                                                     	Name               	Status
 	pulumi:pulumi:Stack                                      	examples-dev
 +   ├─ kubernetes:stable.example.com:CronTab                 	my-new-cron-object 	created
 +   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  my-crontab-definition  created
Outputs:
	urn: "urn:pulumi:dev::examples::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"
Resources:
	+ 2 created
	1 unchanged
Duration: 17s
```

It looks like both the CronTab definition and instance were both created! Finally, let's verify that they were created
by manually viewing the raw YAML data:

```bash
$ kubectl get ct -o yaml
```

```yaml
- apiVersion: stable.example.com/v1
  kind: CronTab
  metadata:
	annotations:
  	kubectl.kubernetes.io/last-applied-configuration: |
    	{"apiVersion":"stable.example.com/v1","kind":"CronTab","metadata":{"labels":{"app.kubernetes.io/managed-by":"pulumi"},"name":"my-new-cron-object"},"spec":{"cronSpec":"* * * * */5","image":"my-awesome-cron-image"}}
	creationTimestamp: "2020-08-10T09:50:38Z"
	generation: 1
	labels:
  	app.kubernetes.io/managed-by: pulumi
	name: my-new-cron-object
	namespace: default
	resourceVersion: "1658962"
	selfLink: /apis/stable.example.com/v1/namespaces/default/crontabs/my-new-cron-object
	uid: 5e2c56a2-7332-49cf-b0fc-211a0892c3d5
  spec:
	cronSpec: '* * * * */5'
	image: my-awesome-cron-image
kind: List
metadata:
  resourceVersion: ""
  selfLink: ""
```

Let's destroy the CRD and CustomResource object so we can re-create them in Go.

```bash
$ pulumi destroy
Previewing destroy (dev):
     Type                                                         Name                        Plan
 -   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  delete
 -   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          delete
 -   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  delete

Outputs:
  - urn: "urn:pulumi:dev::kubernetes-go-crontabs::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"

Resources:
    - 3 to delete

Do you want to perform this destroy? yes
Destroying (dev):
     Type                                                         Name                        Status
 -   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  deleted
 -   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          deleted
 -   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  deleted

Outputs:
  - urn: "urn:pulumi:dev::kubernetes-go-crontabs::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"

Resources:
    - 3 deleted

Duration: 5s

The resources in the stack have been deleted, but the history and configuration associated with the stack are still maintained.
If you want to remove the stack completely, run 'pulumi stack rm dev'.
```

## Running the App (Go)

First, if you haven't already, [install Go](https://golang.org/doc/install). Then create a new stack:

```bash
$ cd kubernetes-go-crontabs
$ pulumi stack init dev
```

Like before, `main.go` shouldn't compile since we haven't generated the `crontabs` module yet. Let's do that:

```bash
$ ../crd2pulumi go ../crontabs.yaml .
```

This creates a `crontabs/v1` module in the current directory, which contains the useful constructor `NewCronTab()`.

> If you're curious, the commented code is what we would've had to write without `crd2pulumi`. Previously we would have had to input the `Spec` arguments into a generic `map[string]interface{}` with zero type-checking.

Perform the deployment:

```bash
$ pulumi up --yes
Previewing update (dev):
     Type                                                         Name                        Plan
 +   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  create
 +   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          create
 +   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  create

Resources:
    + 3 to create

Updating (dev):
     Type                                                         Name                        Status
 +   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  created
 +   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          created
 +   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  created

Outputs:
    urn: "urn:pulumi:dev::kubernetes-go-crontabs::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"

Resources:
    + 3 created

Duration: 10s
```

Like before, you can run `kubectl get ct -o yaml` to verify that the CronTab object was actually created. Before we leave, let's remove everything we have created:

```bash
$ pulumi destroy --yes
Previewing destroy (dev):
     Type                                                         Name                        Plan
 -   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  delete
 -   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          delete
 -   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  delete

Outputs:
  - urn: "urn:pulumi:dev::kubernetes-go-crontabs::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"

Resources:
    - 3 to delete

Destroying (dev):
     Type                                                         Name                        Status
 -   pulumi:pulumi:Stack                                          kubernetes-go-crontabs-dev  deleted
 -   ├─ kubernetes:stable.example.com:CronTab                     my-new-cron-object          deleted
 -   └─ kubernetes:apiextensions.k8s.io:CustomResourceDefinition  cronTabDef                  deleted

Outputs:
  - urn: "urn:pulumi:dev::kubernetes-go-crontabs::kubernetes:stable.example.com/v1:CronTab::my-new-cron-object"

Resources:
    - 3 deleted

Duration: 3s
```
