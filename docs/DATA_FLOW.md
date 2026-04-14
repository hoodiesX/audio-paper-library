# Data Flow

This document explains how data moves through the system in the main user and admin workflows.

## Upload Flow

### Input

- user opens `/upload`
- user provides:
  - `title`
  - `topic`
  - `course`
  - audio file

### Processing

1. The browser sends multipart form data to `POST /api/audio/upload`.
2. The route validates metadata:
   - required fields must exist
   - field lengths must stay within configured limits
   - values are trimmed and normalized
3. The route validates the file:
   - file must exist
   - file type must match allowed audio formats
   - file size must be at most 50 MB
4. The route applies lightweight upload protections:
   - upload rate limit
   - optional Turnstile verification
5. The route generates a storage key.
6. The file binary is uploaded to R2.
7. The public file URL is built from the configured public base URL.
8. Metadata is written to D1.

### Output

- JSON response containing the created item
- browser navigates to the detail page for that item

### Main Failure Points

- invalid metadata
- non-audio file
- file too large
- upload rate limit triggered
- Turnstile failure
- missing R2 binding
- missing public audio base URL
- R2 upload failure
- D1 write failure

## Homepage / List Flow

### Input

- user opens `/`
- optional query parameters:
  - `topic`
  - `course`

### Processing

1. The page reads URL query parameters on the server.
2. The repository reads filtered audio items from D1.
3. The repository also reads distinct topic and course values for filter controls.

### Output

- rendered homepage
- filter controls populated from actual data
- filtered or unfiltered item list

### Main Failure Points

- D1 binding unavailable
- invalid runtime configuration
- empty result set after filtering

## Detail Page Flow

### Input

- user opens `/audio/:id`

### Processing

1. The server page reads the item id from the route.
2. The repository queries D1 for the matching item.
3. The page renders metadata and passes the stored file URL to the player component.

### Output

- rendered detail page
- player configured with current metadata and last known playback position

### Main Failure Points

- item not found
- D1 runtime not available

## Playback Flow

### Input

- user presses play on the detail page

### Processing

1. The browser streams the audio directly from the stored public URL.
2. The player initializes from `lastPositionSeconds`.
3. Progress UI is synchronized with the actual audio element.
4. Progress updates are sent back to `POST /api/audio/progress`.
5. The route updates the metadata row in D1.

### Output

- continuous playback
- progress persistence across refreshes and devices

### Main Failure Points

- invalid or unavailable public file URL
- D1 write failure for progress persistence

## Filtering Flow

### Input

- user selects `topic`, `course`, or both on the homepage

### Processing

1. The filter form submits via query string.
2. The homepage re-renders on the server.
3. The repository builds a single query with optional filter clauses.
4. Matching rows are returned from D1.

### Output

- shareable filtered URL
- filtered list of audio items
- clear empty state if no results match

### Main Failure Points

- no matching items
- invalid query params are treated as absent rather than breaking the page

## Admin Delete Flow

### Input

- project owner runs:
  - `node --experimental-strip-types ./scripts/delete-audio.ts <audio-id>`

### Processing

1. The script queries D1 for the item by id.
2. The script prints a deletion summary.
3. The operator must type `DELETE`.
4. The script derives the R2 object key from the stored file URL.
5. The script deletes the object from R2 using Wrangler.
6. Only if R2 deletion succeeds does it delete the metadata row from D1.

### Output

- successful removal from both storage systems
- or a strong warning if R2 deletion succeeds but D1 deletion fails

### Main Failure Points

- item not found
- missing Cloudflare credentials
- R2 delete failure
- D1 delete failure after R2 success
