# Admin Operations

This project deliberately keeps destructive operations out of the public website.

That is a product and operational choice, not a missing feature.

## Why Delete Is Not In The Public UI

The system is a single-user personal project. A public delete button would introduce unnecessary risk:

- accidental deletion from the browser
- public attack surface for destructive actions
- pressure to build ad hoc auth inside a project that does not otherwise need it

For this project, the safer choice is an out-of-band admin workflow.

## Supported Admin Workflow

Deletion is performed by a local terminal script:

```bash
node --experimental-strip-types ./scripts/delete-audio.ts <audio-id>
```

## What The Delete Script Does

The script is intentionally standalone and does not depend on the Next.js runtime graph.

It performs the following steps:

1. Query D1 for the item by id.
2. Print a deletion summary:
   - id
   - title
   - topics
   - course
   - file path
   - derived storage key
3. Require explicit confirmation by typing `DELETE`.
4. Delete the corresponding object from R2 using Wrangler.
5. Delete the metadata row from D1.

## Required Operational Inputs

The script expects the following environment variables to be present in the terminal:

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_D1_DATABASE_ID`
- `CLOUDFLARE_D1_API_TOKEN`

It also assumes:

- `wrangler` can authenticate against the correct Cloudflare account
- the R2 bucket name is `audio-paper-library`

## Safety Properties

The workflow is designed to minimize inconsistent state:

- if the item does not exist, the script exits cleanly
- if R2 deletion fails, D1 metadata is not deleted
- if D1 deletion fails after R2 deletion, the script prints a strong warning

This does not make deletion transactional across services, but it does make failures explicit and operator-visible.

## Operational Advice

- always copy the item id from the application carefully
- verify the summary before confirming
- prefer deleting from a terminal session with known Cloudflare credentials
- treat deletion as irreversible
