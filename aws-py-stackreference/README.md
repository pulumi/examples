# StackReference Example

This example creates a "team" EC2 Instance with tags set from _upstream_ "company" and "department" 
stacks via [StackReference](https://www.pulumi.com/docs/intro/concepts/organizing-stacks-projects/#inter-stack-dependencies).

```sh
/**
 *   company
 *   └─ department
 *      └─ team
 */
```

## Getting Started

1. Change directory to `company` and install dependencies.

    ```bash
    $ cd company
    ````

1. Create a Python virtualenv, activate it, and install dependencies:

    This installs the dependent packages [needed](https://www.pulumi.com/docs/intro/concepts/how-pulumi-works/) for our Pulumi program.

    ```bash
    $ python3 -m venv venv
    $ source venv/bin/activate
    $ pip3 install -r requirements.txt
    ```

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    $ pulumi config set companyName 'ACME Widget Company'
    ```

1. Deploy everything with the `pulumi up` command. 

    ```bash
    $ pulumi up
    Previewing update (dev):

        Type                 Name                               Plan
    +   pulumi:pulumi:Stack  aws-py-stackreference-company-dev  create

    Resources:
        + 1 to create

    Do you want to perform this update? yes
    Updating (dev):

        Type                 Name                               Status
    +   pulumi:pulumi:Stack  aws-py-stackreference-company-dev  created

    Outputs:
        companyName: "ACME Widget Company"

    Resources:
        + 1 created

    Duration: 1s

    Permalink: https://app.pulumi.com/clstokes/aws-py-stackreference-company/dev/updates/1
    ```

1. Change directory to `department` and install dependencies.

    ```bash
    $ cd ../company
    ````
   
1. Create a Python virtualenv, activate it, and install dependencies:

   ```bash
   $ virtualenv -p python3 venv
   $ source venv/bin/activate
   $ pip3 install -r requirements.txt
   ```

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the required configuration variables:

    ```bash
    $ pulumi config set departmentName 'E-Commerce'
    ```

1. Deploy everything with the `pulumi up` command. 

    ```bash
    $ pulumi up
    Previewing update (dev):

        Type                 Name                                  Plan
    +   pulumi:pulumi:Stack  aws-py-stackreference-department-dev  create

    Resources:
        + 1 to create

    Do you want to perform this update? yes
    Updating (dev):

        Type                 Name                                  Status
    +   pulumi:pulumi:Stack  aws-py-stackreference-department-dev  created

    Outputs:
        departmentName: "E-Commerce"

    Resources:
        + 1 created

    Duration: 1s

    Permalink: https://app.pulumi.com/clstokes/aws-py-stackreference-department/dev/updates/1
    ```

1. Change directory to `team` and install dependencies.

    ```bash
    $ cd ../team
    ````

1. Create a Python virtualenv, activate it, and install dependencies:

   ```
   $ virtualenv -p python3 venv
   $ source venv/bin/activate
   $ pip3 install -r requirements.txt
   ```

1. Create a new stack:

    ```bash
    $ pulumi stack init dev
    ```

1. Set the required configuration variables, replacing `YOUR_ORG` with the name of your Pulumi organization:

    ```bash
    $ pulumi config set companyStack YOUR_ORG/aws-py-stackreference-company/dev
    $ pulumi config set departmentStack YOUR_ORG/aws-py-stackreference-department/dev
    $ pulumi config set teamName 'Frontend Dev'
    $ pulumi config set aws:region us-west-2 # any valid AWS zone works
    ```

1. Deploy everything with the `pulumi up` command. 

    ```bash
    $ envchain aws pulumi up
    Previewing update (dev):

        Type                             Name                                           Plan
    +   pulumi:pulumi:Stack              aws-py-stackreference-team-dev                 create
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-py-stackreference-department/dev  read
    >-  ├─ pulumi:pulumi:StackReference  clstokes/aws-py-stackreference-company/dev     read
    +   └─ aws:ec2:Instance              tagged                                         create

    Resources:
        + 2 to create

    Do you want to perform this update? yes
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

    Duration: 28s

    Permalink: https://app.pulumi.com/clstokes/aws-py-stackreference-team/dev/updates/1
    ```


## Clean Up

1. Once you are done, destroy all of the resources and the stack. Repeat this in each 
of the `company`, `department`, and `team` directories from above that you ran `pulumi up` within.

    ```bash
    $ pulumi destroy
    $ pulumi stack rm
    ```
