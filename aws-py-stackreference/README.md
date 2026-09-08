# StackReference example

This example creates a "team" EC2 Instance with tags set from _upstream_ "company" and "department"
stacks via [StackReference](https://www.pulumi.com/docs/intro/concepts/stack/#stackreferences).

This directory contains three Pulumi projects that are deployed in sequence:

- [company/](./company) — creates a "company" stack that exports a company name.
- [department/](./department) — creates a "department" stack that exports a department name.
- [team/](./team) — creates an EC2 instance tagged with values read from the company and department stacks.

```
company
└─ department
   └─ team
```

## Prerequisites

1. [Install Pulumi](https://www.pulumi.com/docs/get-started/install/)
1. [Configure AWS credentials](https://www.pulumi.com/docs/intro/cloud-providers/aws/setup/)
1. [Install Python](https://www.pulumi.com/docs/intro/languages/python/)

## Deploying the example

### Part 1: The company stack

1. Change to the `company` directory and install dependencies:

    ```bash
    cd company
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    pulumi config set companyName 'ACME Widget Company'
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                 Name                               Status
    +   pulumi:pulumi:Stack  aws-py-stackreference-company-dev  created

    Outputs:
        companyName: "ACME Widget Company"

    Resources:
        + 1 created
    ```

### Part 2: The department stack

1. Change to the `department` directory and install dependencies:

    ```bash
    cd ../department
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    pulumi config set departmentName 'E-Commerce'
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                 Name                                  Status
    +   pulumi:pulumi:Stack  aws-py-stackreference-department-dev  created

    Outputs:
        departmentName: "E-Commerce"

    Resources:
        + 1 created
    ```

### Part 3: The team stack

1. Change to the `team` directory and install dependencies:

    ```bash
    cd ../team
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    ```

1. Create a new stack:

    ```bash
    pulumi stack init dev
    ```

1. Set the required configuration variables, replacing `YOUR_ORG` with the name of your Pulumi organization:

    ```bash
    pulumi config set companyStack YOUR_ORG/aws-py-stackreference-company/dev
    pulumi config set departmentStack YOUR_ORG/aws-py-stackreference-department/dev
    pulumi config set teamName 'Frontend Dev'
    pulumi config set aws:region us-west-2
    ```

1. Deploy the stack:

    ```bash
    pulumi up
    ```

    ```
    Updating (dev):

        Type                             Name                                           Status
    +   pulumi:pulumi:Stack              aws-py-stackreference-team-dev                 created
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-py-stackreference-company/dev     read
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-py-stackreference-department/dev  read
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
    ```

## Cleaning up

Once you're finished experimenting, destroy your resources and remove your stacks. Repeat this in each of the `company`, `department`, and `team` directories that you ran `pulumi up` within:

```bash
pulumi destroy
pulumi stack rm
```
