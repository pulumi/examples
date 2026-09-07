# StackReference example

This example creates a "team" EC2 Instance with tags set from _upstream_ "company" and "department"
stacks via [StackReference](https://www.pulumi.com/docs/intro/concepts/stack/#stackreferences).

```
/**
 *   company
 *   └─ department
 *      └─ team
 */
```

This directory contains three Pulumi projects that must be deployed in order:

- [company/](./company) — exports the company name.
- [department/](./department) — exports the department name.
- [team/](./team) — creates an EC2 instance tagged with values read from the company and department stacks.

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
2. [Configure AWS Credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
3. [Install Node.js](https://www.pulumi.com/docs/intro/languages/javascript/)

## Deploying the example

1. Change to the `company` directory and install dependencies:

    ```bash
    cd company
    npm install
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    pulumi config set companyName 'ACME Widget Company'
    ```

1. Deploy the stack with `pulumi up`:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                 Name                               Status
    +   pulumi:pulumi:Stack  aws-ts-stackreference-company-dev  created

    Outputs:
        companyName: "ACME Widget Company"

    Resources:
        + 1 created

    Duration: 1s
    ```

1. Change to the `department` directory and install dependencies:

    ```bash
    cd ../department
    npm install
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    pulumi config set departmentName 'E-Commerce'
    ```

1. Deploy the stack with `pulumi up`:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                 Name                                  Status
    +   pulumi:pulumi:Stack  aws-ts-stackreference-department-dev  created

    Outputs:
        departmentName: "E-Commerce"

    Resources:
        + 1 created

    Duration: 1s
    ```

1. Change to the `team` directory and install dependencies:

    ```bash
    cd ../team
    npm install
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables, replacing `YOUR_ORG` with the name of your Pulumi organization:

    ```bash
    pulumi config set companyStack YOUR_ORG/aws-ts-stackreference-company/dev
    pulumi config set departmentStack YOUR_ORG/aws-ts-stackreference-department/dev
    pulumi config set teamName 'Frontend Dev'
    pulumi config set aws:region us-west-2 # any valid AWS region works
    ```

1. Deploy the stack with `pulumi up`:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                             Name                                           Status
    +   pulumi:pulumi:Stack              aws-ts-stackreference-team-dev                 created
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-ts-stackreference-company/dev     read
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-ts-stackreference-department/dev  read
    +   └─ aws:ec2:Instance              tagged                                         created

    Outputs:
        instanceId  : "i-0a9ede9c446503903"
        instanceTags: {
            Managed By: "Pulumi"
            company   : "ACME Widget Company"
            department: "E-Commerce"
            team      : "Frontend Dev"
        }

    Resources:
        + 2 created

    Duration: 28s
    ```

## Cleaning up

Once you are done, destroy the resources and remove the stack. Repeat this in each of the
`company`, `department`, and `team` directories that you ran `pulumi up` within:

```bash
pulumi destroy
pulumi stack rm
```
