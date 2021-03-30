# REPRO pulumi#6004


https://github.com/pulumi/pulumi/issues/6004

0. `pulumi stack init dev`
1. `pulumi config set azure:location westus'
2. `pulumi up --yes`
3. `./tamper.sh`
4. `pulumi up --yes`


```
Previewing update (dev)

    pulumi:pulumi:Stack azure-functions-raw-dev running
    azure:core:ResourceGroup linuxrg
 ++ azure:appservice:Plan linux-asp create replacement [diff: ~kind]
 +- azure:appservice:Plan linux-asp replace [diff: ~kind]
 -- azure:appservice:Plan linux-asp delete original [diff: ~kind]
    pulumi:pulumi:Stack azure-functions-raw-dev

Resources:
    +-1 to replace
    2 unchanged

Updating (dev)

    pulumi:pulumi:Stack azure-functions-raw-dev running
    azure:core:ResourceGroup linuxrg
    azure:appservice:Plan linux-asp  error: unexpected unknown property value
    azure:appservice:Plan linux-asp **failed** 1 error
    pulumi:pulumi:Stack azure-functions-raw-dev

Diagnostics:
  azure:appservice:Plan (linux-asp):
    error: unexpected unknown property value
```
