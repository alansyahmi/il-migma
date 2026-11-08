/**
 * AI Editorial Review API — /api/admin/editorial-proposals
 *
 * This endpoint is deliberately proposal-only. It can read entries and stage
 * suggested changes, but it cannot write to the published entries table.
 */
import { getDbClient } from '../../lib/dbClient.js';
import { verifyAdmin } from './entries.js';

const EDITABLE_FIELDS = new Set([
  'headword',
  'pos',
  'gender',
  'definitions',
  'etymology_chain',
  'etymology_notes',
  'phonetics',
  'tags',
  'alternative_forms',
  'text_mt',
  'text_en',
  'source_language',
  'is_loanword',
  'root_consonants',
  'stem',
  'verb_form',
  'verb_class',
  'verb_transitivity',
]);

const MAX_PROPOSAL_BYTES = 32_000;

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

async function requireEditorialAdmin(request, env) {
  const host = new URL(request.url).hostname;
  const isLocal = ['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(host);
  if (isLocal && env.EDITORIAL_ALLOW_LOCAL_AUTH === 'true') return true;

  // Do not inherit the existing admin API's fail-open behaviour when the
  // Clerk secret is absent or set to its development placeholder.
  if (!env.CLERK_SECRET_KEY || env.CLERK_SECRET_KEY === 'dummy') return false;
  return verifyAdmin(request, env);
}

async function ensureProposalTable(client) {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS editorial_proposals (
      id TEXT PRIMARY KEY,
      entry_id TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      issue_type TEXT NOT NULL DEFAULT 'general',
      rationale TEXT NOT NULL,
      original_snapshot TEXT NOT NULL,
      proposed_changes TEXT NOT NULL,
      created_at TEXT NOT NULL,
      reviewed_at TEXT,
      reviewed_by TEXT,
      rejection_reason TEXT
    )
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_editorial_proposals_status_created
    ON editorial_proposals(status, created_at DESC)
  `);
  await client.execute(`
    CREATE INDEX IF NOT EXISTS idx_editorial_proposals_entry
    ON editorial_proposals(entry_id, created_at DESC)
  `);
}

function parseJsonColumn(value, fallback = null) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try { return JSON.parse(value); } catch { return fallback; }
}

function normaliseEntry(row) {
  if (!row) return null;
  const entry = { ...row };
  for (const field of ['definitions', 'tags', 'etymology_chain', 'alternative_forms', 'phonetics']) {
    if (field in entry) entry[field] = parseJsonColumn(entry[field], entry[field]);
  }
  return entry;
}

export async function onRequestGet({ request, env }) {
  if (!(await requireEditorialAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

  try {
    const client = getDbClient(env);
    await ensureProposalTable(client);
    const url = new URL(request.url);
    const action = url.searchParams.get('action') || 'search';

    if (action === 'entry') {
      const id = url.searchParams.get('id')?.trim();
      if (!id) return json({ error: 'id is required' }, 400);
      const result = await client.execute({
        sql: 'SELECT * FROM entries WHERE id = ? LIMIT 1',
        args: [id],
      });
      if (!result.rows.length) return json({ error: 'Entry not found' }, 404);
      return json({ entry: normaliseEntry(result.rows[0]) });
    }

    if (action === 'proposals') {
      const status = url.searchParams.get('status') || 'pending';
      if (!['pending', 'rejected', 'approved', 'all'].includes(status)) {
        return json({ error: 'Invalid status filter' }, 400);
      }
      const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 50), 1), 100);
      const result = status === 'all'
        ? await client.execute({
            sql: 'SELECT id, entry_id, status, issue_type, rationale, proposed_changes, created_at, reviewed_at, reviewed_by, rejection_reason FROM editorial_proposals ORDER BY created_at DESC LIMIT ?',
            args: [limit],
          })
        : await client.execute({
            sql: 'SELECT id, entry_id, status, issue_type, rationale, proposed_changes, created_at, reviewed_at, reviewed_by, rejection_reason FROM editorial_proposals WHERE status = ? ORDER BY created_at DESC LIMIT ?',
            args: [status, limit],
          });
      return json({
        proposals: result.rows.map((row) => ({
          ...row,
          proposed_changes: parseJsonColumn(row.proposed_changes, {}),
        })),
      });
    }

    if (action !== 'search') return json({ error: 'Unknown action' }, 400);
    const q = url.searchParams.get('q')?.trim();
    if (!q) return json({ error: 'q is required for entry search' }, 400);
    const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 20), 1), 50);
    const result = await client.execute({
      sql: 'SELECT id, headword, pos FROM entries WHERE headword LIKE ? ORDER BY headword LIMIT ?',
      args: [`%${q}%`, limit],
    });
    return json({ entries: result.rows });
  } catch (error) {
    console.error('[EDITORIAL API][GET]', error);
    return json({ error: 'Editorial request failed' }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!(await requireEditorialAdmin(request, env))) return json({ error: 'Unauthorized' }, 401);

  try {
    const body = await request.json();
    const entryId = typeof body.entry_id === 'string' ? body.entry_id.trim() : '';
    const rationale = typeof body.rationale === 'string' ? body.rationale.trim() : '';
    const issueType = typeof body.issue_type === 'string' ? body.issue_type.trim() : 'general';
    const changes = body.proposed_changes;

    if (!entryId || !rationale || !changes || typeof changes !== 'object' || Array.isArray(changes)) {
      return json({ error: 'entry_id, rationale and proposed_changes object are required' }, 400);
    }
    const fields = Object.keys(changes);
    if (!fields.length || fields.some((field) => !EDITABLE_FIELDS.has(field))) {
      return json({ error: 'proposed_changes contains an empty or unsupported field set' }, 400);
    }
    if (new TextEncoder().encode(JSON.stringify(changes)).length > MAX_PROPOSAL_BYTES) {
      return json({ error: 'Proposal is too large' }, 413);
    }

    const client = getDbClient(env);
    await ensureProposalTable(client);
    const entryResult = await client.execute({
      sql: 'SELECT * FROM entries WHERE id = ? LIMIT 1',
      args: [entryId],
    });
    if (!entryResult.rows.length) return json({ error: 'Entry not found' }, 404);

    const proposalId = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    await client.execute({
      sql: `INSERT INTO editorial_proposals
        (id, entry_id, status, issue_type, rationale, original_snapshot, proposed_changes, created_at)
        VALUES (?, ?, 'pending', ?, ?, ?, ?, ?)`,
      args: [
        proposalId,
        entryId,
        issueType.slice(0, 80),
        rationale.slice(0, 4000),
        JSON.stringify(entryResult.rows[0]),
        JSON.stringify(changes),
        createdAt,
      ],
    });

    return json({
      proposal_id: proposalId,
      entry_id: entryId,
      status: 'pending',
      created_at: createdAt,
      message: 'Proposal saved for human review. The published entry has not been changed.',
    }, 201);
  } catch (error) {
    console.error('[EDITORIAL API][POST]', error);
    return json({ error: 'Unable to save editorial proposal' }, 500);
  }
}
