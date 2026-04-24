# Runtime And Platform

This project is heavily shaped by its deployment target: Cloudflare Pages with edge execution semantics.

## Why Edge Runtime Matters

Cloudflare Pages does not behave like a traditional long-running Node server.

That has practical consequences:

- local disk is not a valid persistence layer
- runtime bindings are injected by the platform
- request context matters for accessing platform services
- production paths must avoid Node-only assumptions where possible

The project works because it now respects those constraints instead of trying to hide them.

## Why Filesystem Persistence Failed

The early local-first model stored audio files on the server filesystem and metadata in a local SQLite-style development pattern.

That broke conceptually in production for two reasons:

1. Cloudflare Pages is not a persistent local-disk environment for application state.
2. Audio needed to remain accessible across devices, not just on the machine that handled the upload.

That led to a necessary split:

- R2 for binaries
- D1 for metadata

## Why D1 And R2 Bindings Matter

On Cloudflare, the application does not “discover” services automatically. It receives them as runtime bindings.

In this project:

- `DB` is the D1 binding
- `AUDIO_BUCKET` is the R2 binding
- `PUBLIC_AUDIO_BASE_URL` provides the public base for playback URLs

These bindings are not simply an implementation detail. They are part of the application’s runtime contract.

## Request Context As A Runtime Dependency

One of the key lessons in this project was that Cloudflare bindings need to be resolved from the request context in production.

That is why the D1 client reads the binding through `getRequestContext()` inside function scope rather than at module initialization time.

This matters because:

- module-level assumptions can break edge execution
- local development and production do not expose bindings in the same way
- fallback logic must not accidentally override the real production path

## Prisma And Edge Runtime

Prisma was useful during the local MVP phase, but it caused runtime problems in edge execution.

The core issue was not that Prisma is “bad”; it was that the production environment was wrong for it in this project’s Cloudflare path.

The current rule is:

- production Cloudflare paths use D1
- Prisma is kept only for legacy SQLite-to-D1 migration scripts

This is an example of platform compatibility driving architectural simplification.

## Why The Current Platform Model Works

The current model is stable because each concern is mapped to the platform component that actually fits it:

- server-rendered pages and APIs: edge runtime
- binary storage: R2
- metadata and lightweight operational data: D1
- destructive operations: local admin script

The result is still a small app, but it no longer relies on assumptions that only hold in local development.
