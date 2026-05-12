# Demo: GCP VM with Multiple NICs on Separate VPCs

Live walkthrough script. Copy-paste each block.

## 0. Setup (one-time)

```bash
# Ensure gcloud is on PATH (adjust to your install location)
export PATH="$HOME/google-cloud-sdk/bin:$PATH"

# From the repo root, jump into the example
cd gcp-ts-vm-multi-nic

# Install Pulumi deps
npm install
```

## 1. Show the code — Component Resources

```bash
# Tour the layout
ls -R components/ index.ts Pulumi.yaml
cat components/vpcNetwork.ts
cat components/multiNicVm.ts
cat index.ts
```

**Highlights to call out:**
- `VpcNetwork` component encapsulates one VPC + subnet + firewalls; reusable.
- `MultiNicVm` component takes a list of subnets and builds one NIC per subnet, with `canIpForward`, `nicType: GVNIC`, a dedicated service account, and a startup script.
- `index.ts` is now ~25 lines — just loops and wires the components together.
- Modern TS setup: `package.json` has `"type": "module"` and `tsconfig.json` uses `"module": "nodenext"` + `"moduleResolution": "nodenext"`, matching [`pulumi/templates/typescript`](https://github.com/pulumi/templates/tree/master/typescript). Pulumi auto-enables `ts-node/esm` ([pulumi/pulumi#18221](https://github.com/pulumi/pulumi/issues/18221), shipped in 3.183) — relative imports use `.js` suffixes.

## 1b. Lint + typecheck with Biome

```bash
npm run lint        # Biome: lint + format check + import sort
npm run typecheck   # tsc --noEmit
```

`npm run lint:fix` auto-applies formatting and safe lint fixes.

## 2. Initialize the stack in the `lumitorch` org

```bash
pulumi stack init lumitorch/dev

# Attach the ESC environment that provides GCP OIDC + project
pulumi config env add cloud-creds/gcp-dev-sandbox --yes

# Confirm config (nicCount=3 by default)
pulumi config
```

Optional — change NIC count live:
```bash
pulumi config set nicCount 4
pulumi config set machineType n2-standard-8   # supports up to 8 NICs
```

## 3. Preview and deploy

```bash
pulumi preview
pulumi up --yes
```

Expect ~17 resources (component wrappers + 3 VPCs + 3 subnets + 4 firewalls + 1 SA + 1 VM) in ~70s with `nicCount=3`.

## 4. Show the multi-NIC proof — three angles

### 4a. Pulumi stack outputs

```bash
pulumi stack output nicSummary --show-secrets
pulumi stack output vmName
pulumi stack output vmZone
```

### 4b. From the GCP API (`gcloud describe`)

```bash
# Pull a fresh OIDC token from the ESC env into gcloud's env var
export CLOUDSDK_AUTH_ACCESS_TOKEN="$(pulumi env open lumitorch/cloud-creds/gcp-dev-sandbox --format json \
  | python3 -c 'import json,sys; print(json.load(sys.stdin)["environmentVariables"]["GOOGLE_OAUTH_ACCESS_TOKEN"])')"

VM=$(pulumi stack output vmName)
ZONE=$(pulumi stack output vmZone)

# One-liner: canIpForward, NIC count, NIC types
gcloud compute instances describe "$VM" --zone "$ZONE" --project pulumi-development \
  --format='value(canIpForward,networkInterfaces.len(),networkInterfaces[].nicType.list())'

# Per-NIC: network + subnet + internal IP
gcloud compute instances describe "$VM" --zone "$ZONE" --project pulumi-development \
  --format='table(networkInterfaces[].network.basename(),networkInterfaces[].subnetwork.basename(),networkInterfaces[].networkIP)'
```

Expected:
```
True    3    GVNIC,GVNIC,GVNIC
```

### 4c. From inside the guest (serial console)

```bash
gcloud compute instances get-serial-port-output "$VM" --zone "$ZONE" --project pulumi-development \
  | grep -A 25 "multi-nic-vm: NIC topology"
```

Expected (abridged):
```
ens4   UP   10.10.0.2/32   (vpc-0)
ens5   UP   10.11.0.2/32   (vpc-1)
ens6   UP   10.12.0.2/32   (vpc-2)
```

## 5. Local Policy Pack — enforce multi-NIC best practices

The `policy/` folder is a self-contained Pulumi Policy Pack. It enforces:

| Rule | What it checks |
|---|---|
| `require-can-ip-forward-on-multi-nic` | Multi-NIC VMs must set `canIpForward: true` |
| `require-gvnic` | Every NIC must use `nicType: "GVNIC"` |
| `require-dedicated-service-account` | No default Compute SA |
| `limit-public-nics` | At most 1 NIC with a public IP |
| `no-public-firewall-ingress` | No `0.0.0.0/0` ingress |

### 5a. Install policy deps

```bash
(cd policy && npm install)
```

### 5b. Run the policy locally against the compliant stack — expect ✅

```bash
pulumi preview --policy-pack ./policy
```

Output ends with:
```
Policies:
    ✅ multi-nic-vm-policies@v0.1.0 (local: policy)
```

### 5c. Break the code on purpose to show the policy catching it

Edit `components/multiNicVm.ts` and flip:

```diff
-            canIpForward: true,
+            canIpForward: false,
```

Then preview again:

```bash
pulumi preview --policy-pack ./policy
```

Output:
```
Policies:
    ❌ multi-nic-vm-policies@v0.1.0 (local: policy)
        - [mandatory]  require-can-ip-forward-on-multi-nic  (gcp:compute/instance:Instance: multi-nic-vm)
          Instance has 3 NICs but canIpForward is not set. Multi-NIC VMs must enable IP forwarding.
```

The preview is **blocked** — mandatory policy violations gate the update. Revert the change:

```bash
git checkout -- components/multiNicVm.ts
pulumi preview --policy-pack ./policy   # ✅ again
```

### 5d. (Bonus) Enforce on `up` too

```bash
pulumi up --policy-pack ./policy --yes
```

Same gate — `up` won't proceed if mandatory policies fail.

## 6. Demo the dynamic NIC count (optional)

```bash
pulumi config set nicCount 4
pulumi config set machineType n2-standard-8
pulumi up --policy-pack ./policy --yes
pulumi stack output nicSummary
```

## 7. Cleanup

```bash
pulumi destroy --yes
pulumi stack rm lumitorch/dev --yes
```

## Cheat sheet — one screen of commands

```bash
export PATH="$HOME/google-cloud-sdk/bin:$PATH"
cd gcp-ts-vm-multi-nic
npm install && (cd policy && npm install)
pulumi stack init lumitorch/dev
pulumi config env add cloud-creds/gcp-dev-sandbox --yes
pulumi preview --policy-pack ./policy        # ✅ policy gate
pulumi up --policy-pack ./policy --yes
pulumi stack output nicSummary
export CLOUDSDK_AUTH_ACCESS_TOKEN="$(pulumi env open lumitorch/cloud-creds/gcp-dev-sandbox --format json | python3 -c 'import json,sys; print(json.load(sys.stdin)["environmentVariables"]["GOOGLE_OAUTH_ACCESS_TOKEN"])')"
VM=$(pulumi stack output vmName); ZONE=$(pulumi stack output vmZone)
gcloud compute instances describe "$VM" --zone "$ZONE" --project pulumi-development \
  --format='value(canIpForward,networkInterfaces.len(),networkInterfaces[].nicType.list())'
gcloud compute instances get-serial-port-output "$VM" --zone "$ZONE" --project pulumi-development \
  | grep -A 25 "multi-nic-vm: NIC topology"
pulumi destroy --yes
```
