# Computer Control Foundation

Scope: Live Runtime only.

This first slice builds the foundation for future local control features. It does not add advanced desktop automation yet.

## Included

```text
Computer Control 1: capability registry
Computer Control 2: Guarded and YOLO policy engine
Computer Control 3: action audit log
```

## Registry

The registry describes available capabilities with stable ids, names, risk levels, platform support, workspace-scope needs, timeouts, and enabled state.

## Modes

Guarded is the default. Low-risk work can proceed. Higher-risk work requires approval.

YOLO is explicit session mode. It expires after a timer, uses approved capabilities and approved workspaces, keeps a visible state, and can be stopped.

## Audit log

Planned actions can be recorded with timestamp, mode, capability id, input summary, workspace, risk level, source, status, decision reason, and output summary.

The dashboard bridge stores this locally for now. Native persistence can replace it later without changing the core schema.

## Files

```text
packages/core/src/control/schema.ts
packages/core/src/control/registry.ts
packages/core/src/control/policy.ts
packages/core/src/control/audit.ts
packages/core/src/control/control.test.ts
apps/dashboard/src/lib/controlBridge.ts
```

## Test

```bash
npm run test:control --workspace @live-runtime/core
npm run build
```
