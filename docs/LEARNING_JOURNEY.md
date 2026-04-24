# Learning Journey

This project is useful as a learning artifact because the architecture changed for concrete reasons, not for novelty.

## Phase 1: Local MVP Thinking

The first version was shaped like a local app:

- local filesystem storage for uploads
- local database mindset
- direct, simple full-stack flow

This phase was valuable because it made the core product useful quickly:

- upload
- list
- detail
- playback
- progress persistence

The lesson from this phase was not that local-first thinking is wrong. It was that it is a good way to find the real product shape before optimizing for deployment.

## Phase 2: Cloud Reality Check

Once the app moved toward Cloudflare Pages, the original assumptions broke:

- local disk was not a real storage system anymore
- runtime bindings mattered
- serverless-style execution forced clearer separation of concerns

This phase taught the main platform lesson of the project:

the deployment model is part of the architecture, not something to “deal with later.”

## Phase 3: Storage Separation

The system then split into:

- R2 for audio binaries
- D1 for metadata

This was the point where the project stopped being a local MVP with a deployment target and became a small distributed application.

The lesson here was that binary storage and metadata querying are different problems and should be treated as such.

## Phase 4: Edge Compatibility

Prisma worked during the local phase, but it caused production friction in edge runtime paths.

The fix was not to force Prisma to remain central. The fix was to make production use the system that actually matches the platform:

- D1 in production
- Prisma only for legacy migration support

The lesson was that portability matters less than correctness in the actual runtime that serves users.

## Phase 5: Product Shaping

Once the runtime was stable, the project could add features that made the library meaningfully more useful:

- URL-based server-side filtering by topic and course
- upload hardening
- optional Turnstile
- admin-only delete workflow

The lesson here was that product quality depends on boring decisions being made well:

- explicit filters instead of flashy search panels
- admin CLI instead of risky public delete UI
- minimal protections around the write surface instead of speculative security systems

## Final Takeaway

The strongest lesson from this repository is that architecture became clearer when each constraint was taken seriously:

- edge runtime constraint
- storage constraint
- single-user product constraint
- maintenance constraint

That is why the final system is small but coherent. It is not trying to look like a large platform. It is trying to be a correct system for its actual purpose.
