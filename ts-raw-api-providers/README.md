# Two ways to call a raw API from Pulumi

There are two paths when the API you want to use has no Pulumi provider yet,
and you don't want to wait around for one. This example does both, against
real public endpoints, so you can see how they actually behave.

1. **`pulumi.dynamic.Resource`** — write a custom resource with `create`,
   `read`, `update`, `delete`, and `diff`. Pulumi stores it in state, diffs it
   like any other resource, and calls the right method on `up` / `refresh` /
   `destroy`. This is what you want when the thing has an identity and a
   lifecycle.
2. **`@pulumi/command`** — shell out a command on create, optionally another
   on delete. There's no state of the remote object, just the command itself.
   Fine for one-shot effects (a curl call, a CLI invocation).

Both patterns hit real public HTTP endpoints. No local files, no fakes.

| Pattern | Endpoint | Verbs used |
|---|---|---|
| Dynamic provider (`HttpbinEcho`) | `https://httpbin.org/anything` | `POST`, `GET`, `PUT`, `DELETE` |
| `command.local.Command` (`zen`) | `https://api.github.com/zen` | `GET` via `curl` |

## Files

| File | What it does |
|---|---|
| `httpbinEcho.ts` | The dynamic provider. `HttpbinEcho` class with the CRUD methods, each backed by `fetch()`. |
| `index.ts` | Uses `HttpbinEcho` (pattern 1) and `command.local.Command` (pattern 2). |

## Run it

```bash
npm install
pulumi stack init lumitorch/dev
pulumi up --yes
pulumi stack output         # echoUrl, echoEtag, echoLastMethod=POST, echoTraceId, echoedBody, githubZen

# Update path: change an input, watch it call update() (PUT) instead of create() (POST):
pulumi config set message "edited via pulumi up"
pulumi up --yes
pulumi stack output         # echoLastMethod is now PUT, etag and traceId changed, echoedBody.message updated

# Delete path:
pulumi destroy --yes        # calls delete() → DELETE https://httpbin.org/anything
```

## How the dynamic provider works

The five methods on `provider` get serialized by Pulumi, closures and all,
and run in a separate Node process. Two things to know:

- Method bodies have to be self-contained. We `await import("node:crypto")`
  *inside* each method (and use Node 18+'s built-in `fetch`) so nothing
  top-level is captured by the closure serializer.
- The `id` returned from `create` is the resource's identity for every later
  `read` / `update` / `delete` call. Here we use httpbin's `X-Amzn-Trace-Id`
  as a stand-in.
- `diff` decides between an in-place update (`changes: true`) and a replace
  (`replaces: ["someProp"]`).

### Pointing this at a real REST API

Swap the four `fetch` calls in `httpbinEcho.ts` for calls against your real
service. The CRUD shape stays the same:

```
create  → POST   /resource          → returns body with id
read    → GET    /resource/{id}     → returns body
update  → PUT    /resource/{id}     → returns body
delete  → DELETE /resource/{id}     → 204
```

## Which one do I want?

| Need | Use |
|---|---|
| Real lifecycle, diffs, refresh, outputs tracked in state | Dynamic provider |
| Fire a curl/CLI on create, optionally clean up on delete | `@pulumi/command` |
| Reuse across projects or languages | Build a real provider via the [Terraform bridge](https://github.com/pulumi/pulumi-terraform-bridge) or [provider-boilerplate](https://github.com/pulumi/pulumi-provider-boilerplate) |
