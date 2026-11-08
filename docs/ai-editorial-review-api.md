# AI Editorial Review API

This API stages editorial suggestions for human review. It does **not** modify published dictionary entries.

## Endpoint

`/api/admin/editorial-proposals`

All requests require a Clerk admin session token in the `Authorization: Bearer <token>` header. The Worker must have a valid `CLERK_SECRET_KEY`. For local-only development, `EDITORIAL_ALLOW_LOCAL_AUTH=true` may be set in `.dev.vars`; never set it in production.

## Operations

### Search entries

`GET ?action=search&q=<headword fragment>&limit=20`

Returns matching entry IDs, headwords and parts of speech.

### Read an entry

`GET ?action=entry&id=<entry-id>`

Returns the current entry row. JSON-backed fields are parsed where possible.

### Create an editorial proposal

`POST`

Example body:

```json
{
  "entry_id": "example-entry-id",
  "issue_type": "definition",
  "rationale": "The Maltese definition is ambiguous and should distinguish the transitive sense.",
  "proposed_changes": {
    "definitions": [
      {
        "text_mt": "Proposed Maltese definition",
        "text_en": "Proposed English gloss"
      }
    ]
  }
}
```

Allowed proposal fields: `headword`, `pos`, `gender`, `definitions`, `etymology_chain`, `etymology_notes`, `phonetics`, `tags`, `alternative_forms`, `text_mt`, `text_en`, `source_language`, `is_loanword`, `root_consonants`, `stem`, `verb_form`, `verb_class`, `verb_transitivity`.

A proposal stores the original database row as a snapshot, the suggested changes, rationale, status and timestamp. It returns a proposal ID and leaves the published entry unchanged.

### List proposals

`GET?action=proposals&status=pending&limit=50`

Supported statuses: `pending`, `rejected`, `approved`, `all`.

Each result includes the original snapshot and proposed changes so a review client can render a field-level diff.

## Safety model

- This API has no endpoint that updates or deletes rows in `entries`.
- Creating a proposal only inserts into `editorial_proposals`.
- Only an authenticated Clerk admin can read or stage proposals.
- The proposal API fails closed if the Clerk secret is missing or still set to `dummy`.
- Proposal fields are allowlisted and the proposed JSON payload is size-limited.
- The table and indexes are created lazily on first request.

## Current scope / next step

This is the first integration layer: authenticated read access and proposal staging. The approval action is intentionally not implemented yet. Before adding it, approval should be wired through the existing admin entry persistence path (rather than issuing ad-hoc SQL), with a stale-snapshot check to prevent overwriting edits made after the proposal was created.
