# Failures And Trade-offs

This project became better mainly by running into the limits of the original assumptions.

## Local Filesystem Persistence vs Object Storage

### Initial Assumption

The earliest model treated uploaded audio like a local app concern:

- save the file on disk
- save metadata locally
- serve the file from the same application

### Why It Failed

That works for a local MVP, but it does not fit Cloudflare Pages:

- the runtime is not a persistent local server
- files uploaded in one execution context are not a durable system of record
- cross-device access needs a stable public storage layer

### What Changed

- audio binaries moved to R2
- metadata stayed separate in D1

### Trade-off

The system gained platform correctness and multi-device access, but it became a real multi-service system rather than a single-process app.

## Prisma vs Edge Runtime

### Initial Assumption

Prisma was a convenient way to move fast during the local phase.

### Why It Failed

Production Cloudflare paths could not safely rely on Prisma in edge runtime execution. This caused runtime failures on reads and writes.

### What Changed

- D1 became the production data path
- Prisma was reduced to a local fallback only

### Trade-off

The code became more explicit and platform-aware, but less ORM-driven and less uniform across local and production environments.

## Public Simplicity vs Stronger Access Control

### Current Choice

The public site remains simple:

- no public auth system
- no delete UI
- no account model

### Why This Is Acceptable

The project is single-user and personal. Adding homemade auth to support rare destructive actions would increase risk more than it would reduce it.

### Trade-off

The system is intentionally not a general-purpose multi-user product. Administrative power is handled out of band.

## Personal Project Pragmatism vs Production-Grade Security

### Current Protections

- upload validation
- file size limits
- metadata length limits
- upload-only rate limiting
- optional Turnstile

### What Is Not Present

- full authentication
- signed media URLs
- deep observability
- antivirus or file scanning
- transaction coordination between D1 and R2

### Trade-off

This is not enterprise-grade hardening. It is deliberate, scoped protection around the part of the system that accepts user input and writes data.

## Cross-Service Consistency

The app writes to two different systems:

- R2
- D1

There is no distributed transaction layer between them.

That means the project accepts a pragmatic consistency model:

- write order is chosen carefully
- failures are surfaced clearly
- destructive operations are kept manual where recovery complexity is highest

For a personal project, this is a reasonable compromise.

## `next-on-pages` As A Transitional Choice

The project currently uses `@cloudflare/next-on-pages`.

That is workable, but it is also a reminder that platform adapters evolve. The codebase had to learn Cloudflare runtime rules directly, especially around bindings and edge-safe execution.

This is acceptable for now, but it is also one of the project’s known future migration points.
