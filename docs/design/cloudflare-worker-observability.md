# Cloudflare Worker Observability

Date: 2026-06-21

## Purpose

Expose Cloudflare Workers observability (logs and traces) as a first-class option across all Worker-backed SST components, with attention to the SSR site family (Astro, ReactRouter, TanStackStart).

## Background

Cloudflare Workers supports observability at two levels:

- **Traces**: capture platform operations (fetch, KV, R2, Durable Object, Queue). Enabled via `observability.traces.enabled = true` with optional `head_sampling_rate`. Custom spans can be added in Worker code via `ctx.tracing`.
- **Logs**: capture `console.*` messages and invocation metadata. Controlled via `observability.logs.enabled` + `invocationLogs`.

The `@pulumi/cloudflare` v6.15.0 `WorkersScript` resource exposes these through `WorkersScriptArgs.observability`:

```typescript
WorkersScriptObservability {
  enabled?: boolean;
  headSamplingRate?: number;
  logs?: {
    enabled: boolean;
    headSamplingRate?: number;
    invocationLogs: boolean;
    destinations?: string[];
    persist?: boolean;
  };
  traces?: {
    enabled?: boolean;
    headSamplingRate?: number;
    destinations?: string[];
    persist?: boolean;
  };
}
```

SST's current `Worker` component does not expose any of this as a first-class arg. Users can only reach it via `transform.worker`.

## Worker Creation Chain

```
AstroArgs -> SsrSiteArgs -> SsrSite.createWorker() -> new Worker(args) -> cf.WorkersScript
```

Three tiers of components create Workers:

1. **Direct `new Worker(args)`** -- `Worker` itself, SSR base (`SsrSite`)
2. **`workerBuilder(handler | WorkerArgs)`** -- `Cron`, `Queue`, `DurableObject`
3. **Custom internal Worker creation** -- `Auth`, `Workflow` (need auditing)

The SSR subclasses (`Astro`, `ReactRouter`, `TanStackStart`) each redeclare their args individually via `extends SsrSiteArgs`, picking specific properties with JSDoc. `SsrSite.createWorker()` builds the Worker with hardcoded `url: true`, `dev: false`, and resolved `handler`/`assets` paths.

## Proposed API Shape

### On `WorkerArgs`

```typescript
observability?: Input<{
  logs?: Input<{
    enabled?: Input<boolean>;
    headSamplingRate?: Input<number>;
    invocationLogs?: Input<boolean>;
  }>;
  traces?: Input<{
    enabled?: Input<boolean>;
    headSamplingRate?: Input<number>;
  }>;
}>;
```

`destinations` and `persist` intentionally omitted from the initial shape. They can be added later without breaking changes.

### Normalization

```typescript
function normalizeObservability() {
  if (!args.observability) return undefined;
  return output(args.observability).apply((v) => ({
    logs: v.logs
      ? { enabled: true, invocationLogs: true, ...v.logs }
      : undefined,
    traces: v.traces
      ? { enabled: true, ...v.traces }
      : undefined,
  }));
}
```

### Usage

```typescript
// Just traces
new Worker("MyWorker", {
  handler: "src/index.ts",
  observability: { traces: { enabled: true, headSamplingRate: 0.1 } },
});

// Logs + traces
new Worker("MyWorker", {
  handler: "src/index.ts",
  observability: {
    logs: { enabled: true, headSamplingRate: 0.5 },
    traces: { enabled: true, headSamplingRate: 0.1 },
  },
});

// Via SSR component (Astro, ReactRouter, TanStackStart)
new Astro("MySite", {
  observability: { traces: { enabled: true } },
});

// Via workerBuilder components (Cron, Queue, DurableObject)
new Cron("MyJob", {
  handler: "src/job.handler",
  observability: { traces: { enabled: true } },
});
```

### Threading

1. Add `observability` to `WorkerArgs` in `worker.ts`
2. Add `normalizeObservability()` and thread into `cf.WorkersScript` call
3. Add to `SsrSiteArgs` in `ssr-site.ts` and thread through `createWorker()`
4. Subclasses (`AstroArgs`, `ReactRouterArgs`, `TanStackStartArgs`) inherit via `extends SsrSiteArgs`
5. `workerBuilder` components pass `WorkerArgs` through -- no changes needed

## Open Questions

1. **Top-level shorthand?** Should `observability: true` enable all observability with defaults?
2. **Destinations and persist?** Defer or include now?
3. **Auth and Workflow?** Need auditing for internal Worker creation patterns.
4. **Go dynamic provider?** Has stale `observability` struct with `HeapSamplingRate`. It's deprecated -- leave it or clean up?
