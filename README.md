# Audio Paper Library

Audio Paper Library is a personal full-stack web application for storing, organizing, and listening to audio summaries, podcast-style study material, and similar long-form audio content.

The current system is designed around Cloudflare’s edge platform:

- Next.js 14 with the App Router
- Cloudflare Pages and edge runtime
- R2 for audio binaries
- D1 for metadata and lightweight operational data

This repository is intentionally small, but it is no longer a purely local MVP. It now behaves like a distributed application with separate runtime, storage, and metadata concerns.

## What The Project Does

- Upload audio files from the browser
- Store audio binaries in R2
- Store metadata and listening progress in D1
- Browse the library from a homepage
- Open item detail pages with playback and resume support
- Filter items by topic and course using shareable URL parameters
- Run an admin-only local delete workflow that removes both R2 objects and D1 metadata

## Tech Stack

- `Next.js 14`
- `React`
- `TypeScript`
- `Tailwind CSS`
- `Cloudflare Pages`
- `Cloudflare D1`
- `Cloudflare R2`
- `@cloudflare/next-on-pages`

## Repository Structure

```text
app/                 App Router pages and API routes
components/          UI components
lib/                 Runtime helpers, repository layer, storage, D1 client
prisma/              Local development schema and SQLite support
scripts/             Local admin and migration scripts
docs/                Architecture and operational documentation
```

## Local Development

At a high level:

1. Install dependencies
2. Provide local environment variables
3. Run the development server

```bash
npm install
npm run dev
```

Local development can still use the original Prisma + SQLite fallback where that is helpful, but the production architecture is D1 + R2.

## Production Deployment

Production is intended for Cloudflare Pages with:

- D1 binding: `DB`
- R2 binding: `AUDIO_BUCKET`
- public audio base URL: `PUBLIC_AUDIO_BASE_URL`

The application is built to run in the edge runtime, so production paths must stay compatible with Cloudflare request-context bindings and must not rely on local filesystem persistence.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Data Flow](docs/DATA_FLOW.md)
- [Runtime And Platform](docs/RUNTIME_AND_PLATFORM.md)
- [Admin Operations](docs/ADMIN_OPERATIONS.md)
- [Failures And Trade-offs](docs/FAILURES_AND_TRADEOFFS.md)
- [Future Evolutions](docs/FUTURE_EVOLUTIONS.md)
- [Learning Journey](docs/LEARNING_JOURNEY.md)
