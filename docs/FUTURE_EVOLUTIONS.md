# Future Evolutions

This document describes realistic next steps, not speculative platform fantasies.

## Near-Term Improvements

### Better Upload Feedback

- surface rate-limit and validation errors more clearly in the UI
- improve progress and failure messaging during larger uploads

### Signed Media Delivery

- consider signed URLs if the library ever needs to be less publicly accessible
- keep this optional until access control becomes a real requirement

### Safer Operational Tooling

- add a read-only admin inspection script
- add a small script to verify D1 rows against existing R2 objects

### Documentation Of Environment Setup

- make local and Cloudflare environment requirements easier to audit
- document expected bindings and variables in a tighter checklist

## Medium-Term Improvements

### Search Beyond Topic And Course

- add lightweight full-text search over titles and future notes/transcripts
- keep URL-based filtering as the primary navigation model

### Notes And Transcript Support

- attach optional transcripts or notes to audio items
- make them filterable or searchable without changing the core playback model

### Better Abuse Protection

- tune rate-limiting thresholds based on real use
- require Turnstile only in production if abuse becomes visible

### Operational Observability

- add better structured logging around uploads and storage failures
- introduce a simple way to trace failed writes across D1 and R2

## Long-Term Scaling Ideas

### Controlled Access

- add lightweight private access controls if the project stops being purely personal
- do this only when the product model actually changes

### Metadata Enrichment

- richer course organization
- manual collections or playlists
- transcript-derived recommendations or grouping

### Media Delivery Refinement

- signed URLs instead of permanently public URLs
- optional per-object policy changes

### Platform Modernization

- replace `@cloudflare/next-on-pages` with the current preferred Cloudflare adapter when the migration cost is justified

## What Is Intentionally Not Prioritized

- multi-user role systems
- complex admin dashboards
- event-driven background pipelines
- enterprise audit workflows

Those additions would make sense for a different product. They are not the right next move for this one.
